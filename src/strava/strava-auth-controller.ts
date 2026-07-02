import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';
import { UserId } from 'src/decorators/user-id.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { StravaService } from './strava.service';

@Controller('strava')
export class StravaAuthController {
  constructor(private readonly stravaService: StravaService) {}

  private decodeState(state: string) {
    try {
      return JSON.parse(Buffer.from(state, 'base64').toString()) as {
        userId: number;
        redirectUri: string;
      };
    } catch {
      throw new BadRequestException('Invalid state');
    }
  }

  private buildRedirectUrl(
    redirectUri: string,
    options?: {
      pathOverride?: string;
      query?: Record<string, string | number | boolean>;
    },
  ) {
    const { pathOverride, query = {} } = options ?? {};

    try {
      const parsed = new URL(redirectUri);
      const isHttpRedirect =
        parsed.protocol === 'http:' || parsed.protocol === 'https:';

      if (isHttpRedirect) {
        if (pathOverride) {
          parsed.pathname = `/${pathOverride.replace(/^\/+/, '')}`;
        }

        Object.entries(query).forEach(([key, value]) => {
          parsed.searchParams.set(key, String(value));
        });

        return parsed.toString();
      }

      const originalPath = parsed.pathname.replace(/^\/+/, '');
      const hasHostStyle = Boolean(parsed.hostname) && !originalPath;
      const targetPath = pathOverride ?? parsed.hostname ?? originalPath ?? '';
      const normalizedPath = targetPath || parsed.hostname || originalPath;
      const queryString = new URLSearchParams(
        Object.entries(query).map(([key, value]) => [key, String(value)]),
      ).toString();
      const baseUrl = hasHostStyle
        ? `${parsed.protocol}//${normalizedPath}`
        : `${parsed.protocol}///${normalizedPath}`;

      return queryString ? `${baseUrl}?${queryString}` : baseUrl;
    } catch {
      const fallbackPath = pathOverride ?? 'strava-error';
      const queryString = new URLSearchParams(
        Object.entries(query).map(([key, value]) => [key, String(value)]),
      ).toString();
      const baseUrl = `jfapp:///${fallbackPath}`;

      return queryString ? `${baseUrl}?${queryString}` : baseUrl;
    }
  }

  @UseGuards(RolesGuard)
  @Get('connect')
  connect(
    @UserId() loggedUserId: number,
    @Query('redirectUri') redirectUri: string,
  ) {
    if (!redirectUri) {
      throw new BadRequestException('redirectUri is required');
    }

    const clientId = process.env.STRAVA_CLIENT_ID;
    const stravaRedirect = process.env.STRAVA_REDIRECT_URI;

    if (!clientId || !process.env.STRAVA_REDIRECT_URI) {
      throw new Error('Strava environment variables not configured');
    }

    // 🔐 Encode seguro do state
    const state = Buffer.from(
      JSON.stringify({
        userId: loggedUserId,
        redirectUri,
      }),
    ).toString('base64');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: stravaRedirect, // callback backend
      approval_prompt: 'auto',
      scope: 'activity:read_all',
      state,
    });

    return {
      url: `https://www.strava.com/oauth/authorize?${params.toString()}`,
    };
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error) {
      if (!state) {
        return res.redirect(
          this.buildRedirectUrl('jfapp:///strava-error', {
            query: { reason: 'access_denied' },
          }),
        );
      }

      const { redirectUri } = this.decodeState(state);

      return res.redirect(
        this.buildRedirectUrl(redirectUri, {
          pathOverride: 'strava-error',
          query: { reason: 'access_denied' },
        }),
      );
    }

    if (!code || !state) {
      throw new BadRequestException('Invalid Strava callback');
    }

    const { userId, redirectUri } = this.decodeState(state);

    try {
      const tokenParams = new URLSearchParams({
        client_id: process.env.STRAVA_CLIENT_ID ?? '',
        client_secret: process.env.STRAVA_CLIENT_SECRET ?? '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.STRAVA_REDIRECT_URI ?? '',
      });

      const response = await axios.post(
        'https://www.strava.com/api/v3/oauth/token',
        tokenParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      await this.stravaService.saveConnection({
        userId,
        athleteId: response.data.athlete.id,
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: response.data.expires_at,
      });

      // ✅ sucesso → volta para app
      return res.redirect(
        this.buildRedirectUrl(redirectUri, {
          query: { connected: true },
        }),
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('========== STRAVA TOKEN EXCHANGE ERROR ==========');
        console.error('Status:', err.response?.status);
        console.error('Status Text:', err.response?.statusText);
        console.error('Response:', err.response?.data);
        console.error('Redirect URI:', process.env.STRAVA_REDIRECT_URI);
        console.error('===============================================');
      }

      console.log(err);
      return res.redirect(
        this.buildRedirectUrl(redirectUri, {
          pathOverride: 'strava-error',
          query: { reason: 'token_exchange_failed' },
        }),
      );
    }
  }

  @UseGuards(RolesGuard)
  @Get('status')
  async status(@UserId() loggedUserId: number) {
    const connection = await this.stravaService.findByUser(loggedUserId);

    return {
      connected: !!connection,
    };
  }
}

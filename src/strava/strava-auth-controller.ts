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
      return res.redirect('jfapp://strava-error?reason=access_denied');
    }

    if (!code || !state) {
      throw new BadRequestException('Invalid Strava callback');
    }

    let decoded: { userId: number; redirectUri: string };

    try {
      decoded = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      throw new BadRequestException('Invalid state');
    }

    const { userId, redirectUri } = decoded;

    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      });

      await this.stravaService.saveConnection({
        userId,
        athleteId: response.data.athlete.id,
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: response.data.expires_at,
      });

      // ✅ sucesso → volta para app
      return res.redirect(`${redirectUri}?connected=true`);
    } catch (err) {
      console.log(err);
      return res.redirect('jfapp://strava-error?reason=token_exchange_failed');
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

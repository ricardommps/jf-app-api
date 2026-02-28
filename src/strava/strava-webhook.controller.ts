import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Request } from 'express';
import { StravaService } from './strava.service';

interface StravaWebhookEvent {
  object_type: string;
  aspect_type: 'create' | 'update' | 'delete';
  object_id: number;
  owner_id: number;
  subscription_id: number;
  event_time: number;
}

@Controller('strava/webhook')
export class StravaWebhookController {
  private readonly logger = new Logger(StravaWebhookController.name);

  constructor(private readonly stravaService: StravaService) {}

  @Get()
  verify(@Query() query: any) {
    const verifyToken = process.env.STRAVA_VERIFY_TOKEN;

    if (query['hub.verify_token'] !== verifyToken) {
      throw new ForbiddenException();
    }

    return {
      'hub.challenge': query['hub.challenge'],
    };
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Body() body: StravaWebhookEvent,
    @Headers('x-strava-signature') signature: string,
    @Req() req: Request & { rawBody: Buffer },
  ) {
    this.validateSignature(signature, req.rawBody);

    if (body.object_type === 'activity' && body.aspect_type === 'create') {
      await this.stravaService.handleNewActivity(body.object_id, body.owner_id);
    }

    return { received: true };
  }

  private validateSignature(signature: string, rawBody: Buffer) {
    if (!signature) {
      throw new ForbiddenException('Missing signature');
    }

    const expectedSignature =
      'sha256=' +
      crypto
        .createHmac('sha256', process.env.STRAVA_CLIENT_SECRET as string)
        .update(rawBody)
        .digest('hex');

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      )
    ) {
      this.logger.warn('Invalid Strava signature');
      throw new ForbiddenException('Invalid signature');
    }
  }
}

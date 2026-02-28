import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StravaWebhookController } from './strava-webhook.controller';
import { StravaService } from './strava.service';

import { FinishedEntity } from 'src/entities/finished.entity';
import { ProgramEntity } from 'src/entities/program.entity';
import { StravaConnectionEntity } from 'src/entities/strava-connection.entity';
import { WorkoutsEntity } from 'src/entities/workouts.entity';
import { StravaAuthController } from './strava-auth-controller';
import { StravaController } from './strava-controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StravaConnectionEntity,
      ProgramEntity,
      WorkoutsEntity,
      FinishedEntity,
    ]),
  ],
  controllers: [
    StravaWebhookController,
    StravaAuthController,
    StravaController,

    StravaWebhookController,
    StravaAuthController,
    StravaController,
  ],
  providers: [StravaService],
  exports: [StravaService], // caso queira usar em outro módulo
})
export class StravaModule {}

import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserId } from 'src/decorators/user-id.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { StravaService } from './strava.service';

@Controller('strava')
export class StravaController {
  constructor(private readonly stravaService: StravaService) {}

  // strava.controller.ts

  @UseGuards(RolesGuard)
  @Get('activities')
  async getActivitiesByDate(
    @UserId() userId: number,
    @Query('date') date: string, // formato: YYYY-MM-DD
  ) {
    if (!date) {
      throw new BadRequestException('date is required (YYYY-MM-DD)');
    }

    return this.stravaService.getActivitiesByDate(userId, date);
  }
}

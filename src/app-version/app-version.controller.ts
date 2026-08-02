import { Controller, Get, Query } from '@nestjs/common';

import {
  AppVersionService,
  AppVersionStatusResponse,
} from './app-version.service';

@Controller('app-version')
export class AppVersionController {
  constructor(private readonly appVersionService: AppVersionService) {}

  @Get('/status')
  getStatus(
    @Query('platform') platform: string,
    @Query('version') version?: string,
    @Query('build') build?: string,
  ): AppVersionStatusResponse {
    return this.appVersionService.getStatus({
      platform,
      version,
      build,
    });
  }
}

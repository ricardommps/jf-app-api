import { BadRequestException, Injectable } from '@nestjs/common';

type MobilePlatform = 'ios' | 'android';

interface GetAppVersionStatusInput {
  platform?: string;
  version?: string;
  build?: string;
}

interface PlatformVersionConfig {
  minimumVersion: string | null;
  minimumBuild: string | null;
  latestVersion: string | null;
  storeUrl: string | null;
  title: string;
  message: string;
}

export interface AppVersionStatusResponse {
  platform: MobilePlatform;
  currentVersion: string | null;
  currentBuild: string | null;
  minimumVersion: string | null;
  minimumBuild: string | null;
  latestVersion: string | null;
  storeUrl: string | null;
  forceUpdate: boolean;
  title: string;
  message: string;
  checkedAt: string;
}

@Injectable()
export class AppVersionService {
  getStatus(input: GetAppVersionStatusInput): AppVersionStatusResponse {
    const platform = this.normalizePlatform(input.platform);

    if (!platform) {
      throw new BadRequestException('platform must be ios or android');
    }

    const config = this.getPlatformConfig(platform);
    const currentVersion = this.normalizeString(input.version);
    const currentBuild = this.normalizeString(input.build);
    const forceUpdate = this.shouldForceUpdate(
      currentVersion,
      currentBuild,
      config.minimumVersion,
      config.minimumBuild,
    );

    return {
      platform,
      currentVersion,
      currentBuild,
      minimumVersion: config.minimumVersion,
      minimumBuild: config.minimumBuild,
      latestVersion: config.latestVersion,
      storeUrl: config.storeUrl,
      forceUpdate,
      title: config.title,
      message: config.message,
      checkedAt: new Date().toISOString(),
    };
  }

  private getPlatformConfig(platform: MobilePlatform): PlatformVersionConfig {
    const suffix = platform.toUpperCase();

    return {
      minimumVersion: this.readEnv(`APP_MINIMUM_VERSION_${suffix}`),
      minimumBuild: this.readEnv(`APP_MINIMUM_BUILD_${suffix}`),
      latestVersion:
        this.readEnv(`APP_LATEST_VERSION_${suffix}`) ||
        this.readEnv(`APP_MINIMUM_VERSION_${suffix}`),
      storeUrl: this.readEnv(`APP_STORE_URL_${suffix}`),
      title:
        this.readEnv('APP_FORCE_UPDATE_TITLE') || 'Atualização obrigatória',
      message:
        this.readEnv('APP_FORCE_UPDATE_MESSAGE') ||
        'Uma nova versão do app está disponível. Atualize para continuar usando.',
    };
  }

  private shouldForceUpdate(
    currentVersion: string | null,
    currentBuild: string | null,
    minimumVersion: string | null,
    minimumBuild: string | null,
  ): boolean {
    const parsedCurrentBuild = this.parseInteger(currentBuild);
    const parsedMinimumBuild = this.parseInteger(minimumBuild);

    if (parsedCurrentBuild !== null && parsedMinimumBuild !== null) {
      return parsedCurrentBuild < parsedMinimumBuild;
    }

    if (currentVersion && minimumVersion) {
      return this.compareVersions(currentVersion, minimumVersion) < 0;
    }

    return false;
  }

  private compareVersions(currentVersion: string, minimumVersion: string): number {
    const currentParts = this.toVersionParts(currentVersion);
    const minimumParts = this.toVersionParts(minimumVersion);
    const totalParts = Math.max(currentParts.length, minimumParts.length);

    for (let index = 0; index < totalParts; index += 1) {
      const currentPart = currentParts[index] || 0;
      const minimumPart = minimumParts[index] || 0;

      if (currentPart > minimumPart) {
        return 1;
      }

      if (currentPart < minimumPart) {
        return -1;
      }
    }

    return 0;
  }

  private toVersionParts(value: string): number[] {
    return value
      .split(/[.-]/)
      .map((part) => {
        const match = part.match(/\d+/);
        return match ? Number.parseInt(match[0], 10) : 0;
      });
  }

  private parseInteger(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const parsedValue = Number.parseInt(value, 10);
    return Number.isNaN(parsedValue) ? null : parsedValue;
  }

  private normalizePlatform(value?: string): MobilePlatform | null {
    if (value === 'ios' || value === 'android') {
      return value;
    }

    return null;
  }

  private normalizeString(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const normalizedValue = `${value}`.trim();
    return normalizedValue.length ? normalizedValue : null;
  }

  private readEnv(key: string): string | null {
    return this.normalizeString(process.env[key]);
  }
}

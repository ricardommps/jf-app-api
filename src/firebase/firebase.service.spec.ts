import { ConfigService } from '@nestjs/config';
import Expo from 'expo-server-sdk';
import { FirebaseService } from './firebase.service';

jest.mock('firebase/app', () => ({ initializeApp: jest.fn() }));
jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(),
  ref: jest.fn(),
}));
jest.mock('expo-server-sdk', () => ({
  __esModule: true,
  default: Object.assign(
    jest.fn(() => ({
      sendPushNotificationsAsync: jest
        .fn()
        .mockResolvedValue([{ status: 'ok' }]),
    })),
    { isExpoPushToken: jest.fn(() => true) },
  ),
}));

describe('FirebaseService push notifications', () => {
  const message = { title: 'Teste', body: 'Mensagem de teste' };

  function createService(environment: Record<string, string>) {
    const configService = {
      get: jest.fn((key: string) => environment[key]),
    } as unknown as ConfigService;
    const service = new FirebaseService(configService);
    jest
      .spyOn(service, 'getToken')
      .mockResolvedValue(['ExponentPushToken[test]']);
    return service;
  }

  beforeEach(() => jest.clearAllMocks());

  it.each([undefined, 'production'])(
    'skips push delivery with the explicit flag and NODE_ENV=%s',
    async (environment) => {
      const service = createService({
        DISABLE_PUSH_NOTIFICATIONS: 'true',
        NODE_ENV: environment,
      });

      await expect(
        service.sendNotificationNew('user-id', message),
      ).resolves.toBe(200);

      expect(service.getToken).not.toHaveBeenCalled();
      expect(Expo).not.toHaveBeenCalled();
    },
  );

  it.each(['development', 'local', 'test'])(
    'skips token lookup and push delivery in %s',
    async (environment) => {
      const service = createService({ NODE_ENV: environment });

      await expect(
        service.sendNotificationNew('user-id', message),
      ).resolves.toBe(200);

      expect(service.getToken).not.toHaveBeenCalled();
      expect(Expo).not.toHaveBeenCalled();
    },
  );

  it.each(['.env.development.local', '/app/.env.development.local'])(
    'skips push delivery when using %s even with NODE_ENV=production',
    async (envFilePath) => {
      const service = createService({
        NODE_ENV: 'production',
        ENV_FILE_PATH: envFilePath,
      });

      await expect(
        service.sendNotificationNew('user-id', message),
      ).resolves.toBe(200);

      expect(service.getToken).not.toHaveBeenCalled();
      expect(Expo).not.toHaveBeenCalled();
    },
  );

  it.each([
    { NODE_ENV: 'production' },
    {},
    { NODE_ENV: 'production', DISABLE_PUSH_NOTIFICATIONS: 'false' },
  ])(
    'preserves push delivery for deployed environments: %j',
    async (environment) => {
      const service = createService(environment);

      await expect(
        service.sendNotificationNew('user-id', message),
      ).resolves.toBe(200);

      expect(service.getToken).toHaveBeenCalledWith('user-id');
      const expo = jest.mocked(Expo).mock.results[0].value;
      expect(expo.sendPushNotificationsAsync).toHaveBeenCalledWith([
        { to: 'ExponentPushToken[test]', ...message, data: {} },
      ]);
    },
  );
});

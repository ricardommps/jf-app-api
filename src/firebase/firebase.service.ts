import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Expo from 'expo-server-sdk';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Database, child, get, getDatabase, ref, set } from 'firebase/database';

@Injectable()
export class FirebaseService {
  private app: FirebaseApp;
  private db: Database;
  private dbRef: any;

  constructor(private configService: ConfigService) {
    const firebaseConfig = {
      apiKey: this.configService.get<string>('FIREBASE_API_KEY'),
      authDomain: this.configService.get<string>('FIREBASE_AUTH_DOMAIN'),
      databaseURL: this.configService.get<string>('FIREBASE_DATA_BASE_URL'),
      projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
      storageBucket: this.configService.get<string>('FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: this.configService.get<string>(
        'FIREBASE_MESSAGING_SENDER_ID',
      ),
      appId: this.configService.get<string>('FIREBASE_APP_ID'),
    };

    this.app = initializeApp(firebaseConfig);
    this.db = getDatabase(this.app);
    this.dbRef = ref(this.db);
  }

  async saveToken(userId: string, token: string): Promise<void> {
    try {
      const snapshot = await get(child(this.dbRef, `userTokens/${userId}/`));
      const values = snapshot.val() ?? {};
      const payload = { ...values, token };
      await set(ref(this.db, `userTokens/${userId}/`), payload);
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  }

  async getToken(userId: string): Promise<any> {
    try {
      const snapshot = await get(child(this.dbRef, `userTokens/${userId}`));
      return snapshot.val() ?? {};
    } catch (error) {
      console.error('Error getting token:', error);
      throw error;
    }
  }

  async saveSample(moistureLevel: number, userId: string): Promise<void> {
    try {
      await set(ref(this.db, `users/${userId}/${Date.now().toString()}`), {
        moisture: moistureLevel,
      });
    } catch (error) {
      console.error('Error saving sample:', error);
      throw error;
    }
  }

  async getSamples(userId: string): Promise<{
    currentMoistureLevel: number | null;
    previousMoistureLevels: number[];
  }> {
    try {
      const snapshot = await get(child(this.dbRef, `users/${userId}/`));
      const values = snapshot.val();

      if (!values) {
        return {
          currentMoistureLevel: null,
          previousMoistureLevels: [],
        };
      }

      const moistureReadings = Object.values(values) as { moisture: number }[];
      const readings = moistureReadings.map((reading) => reading.moisture);

      return {
        currentMoistureLevel: readings[readings.length - 1],
        previousMoistureLevels: readings,
      };
    } catch (error) {
      console.error('Error getting samples:', error);
      throw error;
    }
  }

  async sendNotification(customerId: string): Promise<number> {
    const expo = new Expo();
    const { token } = await this.getToken(customerId);

    if (!Expo.isExpoPushToken(token)) {
      throw new InternalServerErrorException(
        'Token inválido para notificações Expo',
      );
    }

    const messages = [
      {
        to: token,
        title: 'Olá Ricardo!',
        body: 'Tem novos treinos disponíveis!',
      },
    ];

    try {
      const result = await expo.sendPushNotificationsAsync(messages);

      const hasError = result.some((r) => r.status !== 'ok');

      if (hasError) {
        console.error('Erro ao enviar notificação:', result);
        throw new InternalServerErrorException('Erro ao enviar notificação');
      }

      return 200;
    } catch (error) {
      console.error('Erro na requisição de notificação:', error);
      throw new InternalServerErrorException('Falha ao enviar notificação');
    }
  }
}

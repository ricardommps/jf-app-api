// src/firebase/firebase.service.ts
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
      const snapshot = await get(child(this.dbRef, `userTokens/${userId}`));
      const tokens: string[] = snapshot.val()?.tokens ?? [];

      if (!tokens.includes(token)) {
        tokens.push(token);
        await set(ref(this.db, `userTokens/${userId}`), { tokens });
      }
    } catch (error) {
      console.error('Error saving token:', error);
      throw new InternalServerErrorException('Falha ao salvar token');
    }
  }

  async getToken(userId: string): Promise<string[]> {
    try {
      const snapshot = await get(child(this.dbRef, `userTokens/${userId}`));
      return snapshot.val()?.tokens ?? [];
    } catch (error) {
      console.error('Error getting token:', error);
      throw new InternalServerErrorException('Falha ao obter token');
    }
  }

  // async sendNotificationNew(
  //   userId: string,
  //   message: {
  //     title: string;
  //     body: string;
  //     data?: {
  //       url: string;
  //       screen: string;
  //       params: string; // JSON string
  //     };
  //   },
  // ): Promise<number> {
  //   const expo = new Expo();
  //   const tokens = await this.getToken(userId);

  //   if (!tokens.length) {
  //     throw new InternalServerErrorException(
  //       'Nenhum token válido encontrado para este usuário',
  //     );
  //   }

  //   const { title, body, data } = message;
  //   const { screen, params: paramsString, url } = data;

  //   // Como paramsString não é usado internamente, pode remover o parse.

  //   const firebasePayload = {
  //     notification: {
  //       title,
  //       body,
  //     },
  //     data: {
  //       url,
  //       screen,
  //       params: paramsString, // Envia direto como string JSON
  //     },
  //   };

  //   const messages = tokens
  //     .filter((token) => Expo.isExpoPushToken(token))
  //     .map((token) => ({
  //       to: token,
  //       title: firebasePayload.notification.title,
  //       body: firebasePayload.notification.body,
  //       data: firebasePayload.data,
  //     }));

  //   if (!messages.length) {
  //     throw new InternalServerErrorException(
  //       'Nenhum token válido para notificações Expo',
  //     );
  //   }

  //   try {
  //     const result = await expo.sendPushNotificationsAsync(messages);
  //     const hasError = result.some((r) => r.status !== 'ok');

  //     if (hasError) {
  //       console.error('Erro ao enviar notificação:', result);
  //       throw new InternalServerErrorException('Erro ao enviar notificação');
  //     }

  //     return 200;
  //   } catch (error) {
  //     console.error('Erro na requisição de notificação:', error);
  //     throw new InternalServerErrorException('Falha ao enviar notificação');
  //   }
  // }

  async sendNotificationNew(
    userId: string,
    message: {
      title: string;
      body: string;
      data?: {
        url?: string;
        screen?: string;
        params?: string; // JSON string opcional
      };
    },
  ): Promise<number> {
    const expo = new Expo();
    const tokens = await this.getToken(userId);

    if (tokens.length) {
      const { title, body, data } = message;

      const firebasePayload: any = {
        notification: { title, body },
        data: {},
      };

      if (data) {
        const { screen, params, url } = data;
        firebasePayload.data = {
          ...(url && { url }),
          ...(screen && { screen }),
          ...(params && { params }),
        };
      }

      const messages = tokens
        .filter((token) => Expo.isExpoPushToken(token))
        .map((token) => ({
          to: token,
          title: firebasePayload.notification.title,
          body: firebasePayload.notification.body,
          data: firebasePayload.data,
        }));

      if (!messages.length) {
        throw new InternalServerErrorException(
          'Nenhum token válido para notificações Expo',
        );
      }

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
}

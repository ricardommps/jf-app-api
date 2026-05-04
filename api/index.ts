import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import serverlessExpress from '@vendia/serverless-express';
import * as bodyParser from 'body-parser';
import { AppModule } from '../src/app.module';

const allowedOrigins = [
  'https://jf-app.vercel.app',
  'https://jfassessoria.vercel.app',
  'http://localhost:3000',
];

let cachedServer: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'authorization'],
    credentials: false,
    optionsSuccessStatus: 204,
  });

  app.use(
    bodyParser.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(bodyParser.urlencoded({ extended: true }));

  app.setGlobalPrefix('api/v2');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();

  return serverlessExpress({ app: expressApp });
}

export default async function handler(req: any, res: any) {
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }

  return cachedServer(req, res);
}

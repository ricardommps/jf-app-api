import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseController } from './firebase.controler';
import { FirebaseService } from './firebase.service';

@Module({
  imports: [ConfigModule],
  controllers: [FirebaseController],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}

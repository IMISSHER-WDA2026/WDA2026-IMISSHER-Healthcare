import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatbotModule } from './chatbot/chatbot.module';
import { FaceRecognitionModule } from './face-recognition/face-recognition.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthMetricsModule } from './health-metrics/health-metrics.module';
import { AuthModule } from './auth/auth.module';
import { UploadsModule } from './uploads/uploads.module';
import { SosModule } from './sos/sos.module';
import { MedicinesModule } from './medicines/medicines.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const databaseUrl =
          process.env.DATABASE_URL?.trim() ||
          process.env.SUPABASE_DB_URL?.trim() ||
          'postgres://postgres:password123@localhost:5432/imissher_local_db';

        const forceSsl = process.env.DB_SSL === 'true';
        const disableSsl = process.env.DB_SSL === 'false';
        const useSsl =
          !disableSsl &&
          (forceSsl ||
            /supabase\.co|pooler\.supabase\.com/i.test(databaseUrl) ||
            process.env.NODE_ENV === 'production');

        return {
          type: 'postgres' as const,
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: process.env.TYPEORM_SYNCHRONIZE
            ? process.env.TYPEORM_SYNCHRONIZE === 'true'
            : true,
          ssl: useSsl ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    ChatbotModule,
    FaceRecognitionModule,
    NotificationsModule,
    HealthMetricsModule,
    AuthModule,
    MedicinesModule,
    SosModule,
    UploadsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

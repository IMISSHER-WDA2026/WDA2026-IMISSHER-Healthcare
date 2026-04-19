import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// default controller and service
import { AppController } from './app.controller';
import { AppService } from './app.service';

// functional modules
import { ChatbotModule } from './chatbot/chatbot.module';
import { FaceRecognitionModule } from './face-recognition/face-recognition.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthMetricsModule } from './health-metrics/health-metrics.module';
import { AuthModule } from './auth/auth.module';
import { MedicinesModule } from './medicines/medicines.module';
import { SosModule } from './sos/sos.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL') || undefined,

        // // Split in case url not recognized
        // host: configService.get<string>('DB_HOST') || 'db.wunmyjagiwljvxrsurxe.supabase.co',
        // port: Number(configService.get<string>('DB_PORT') || 5432),
        // username: configService.get<string>('DB_USERNAME') || 'postgres',
        // password: configService.get<string>('DB_PASSWORD') || '3RAxL9E.GG./B7g',
        // database: configService.get<string>('DB_DATABASE') || 'postgres',
        autoLoadEntities: true,
        synchronize: false,
        ssl: configService.get<string>('DATABASE_URL')
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),

    ChatbotModule,
    FaceRecognitionModule,
    NotificationsModule,
    HealthMetricsModule,
    AuthModule,
    MedicinesModule,
    SosModule,
    UploadsModule,
    UsersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
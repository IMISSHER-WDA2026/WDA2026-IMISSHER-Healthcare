import { Module } from '@nestjs/common';
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

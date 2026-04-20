import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import { assertSecureCorsConfiguration } from './common/config/runtime-security.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const parsedPort = Number.parseInt(process.env.PORT ?? '3000', 10);
  const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;
  const isProduction = (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';
  const enableSwagger = process.env.ENABLE_SWAGGER
    ? process.env.ENABLE_SWAGGER === 'true'
    : !isProduction;
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  const allowAllOrigins =
    corsOrigins.length === 0 ||
    corsOrigins.includes('*') ||
    corsOrigins.includes('all');

  assertSecureCorsConfiguration(allowAllOrigins);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: allowAllOrigins ? true : corsOrigins,
    credentials: !allowAllOrigins,
  });

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Healthcare API')
      .setDescription('API documentation for the Healthcare platform.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  if (enableSwagger) {
    console.log(`Swagger UI is running on: http://localhost:${port}/api-docs`);
  }
}
bootstrap();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Kích hoạt ValidationPipe toàn cục (Tự động bắt lỗi DTO)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động vứt bỏ các trường không có trong DTO
      transform: true, // Tự động ép kiểu dữ liệu (vd: chuỗi '1' thành số 1)
    }),
  );

  // 2. Mở CORS để Frontend gọi API không bị lỗi
  app.enableCors();

  // 3. Cấu hình Swagger UI (Tài liệu API tự động)
  const config = new DocumentBuilder()
    .setTitle('I.M.I.S.S.H.E.R API')
    .setDescription('Tài liệu API cho hệ sinh thái Y tế Thông minh (WebDev Adventure 2026)')
    .setVersion('1.0')
    .addBearerAuth() // Bật nút cắm Token JWT để test API bảo mật
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // 4. Khởi chạy Server
  await app.listen(3000);
  console.log(`🚀 Application is running on: http://localhost:3000`);
  console.log(`📚 Swagger UI is running on: http://localhost:3000/api-docs`);
}
bootstrap();
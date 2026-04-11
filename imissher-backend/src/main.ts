import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Kích hoạt CORS cho Nam gọi API từ Mobile/Localhost
  app.enableCors();

  // 2. Chuẩn hóa Output (Dữ liệu trả về cho Frontend)
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // 3. Chuẩn hóa Input (Bảo vệ Database khỏi dữ liệu rác)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động loại bỏ các trường (field) lạ mà hacker cố tình nhét vào
      forbidNonWhitelisted: true, // Báo lỗi ngay lập tức nếu gửi data tào lao
      transform: true, // Tự động ép kiểu (ví dụ: chữ "1" sẽ thành số 1)
    }),
  );

  // 4. Cấu hình Swagger (Tài liệu API tự động cho Nam)
  const config = new DocumentBuilder()
    .setTitle('I.M.I.S.S.H.E.R API')
    .setDescription('Tài liệu API cho hệ thống y tế cá nhân - WebDev Adventure 2026')
    .setVersion('1.0')
    .addBearerAuth() // Nút nhập Token để test các API cần đăng nhập
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
  console.log(`🚀 Backend đang chạy tại: http://localhost:3000`);
  console.log(`📖 Tài liệu API (Swagger) tại: http://localhost:3000/api-docs`);
}
bootstrap();
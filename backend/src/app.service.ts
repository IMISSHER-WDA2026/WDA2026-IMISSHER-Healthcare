import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealth(): { status: string; uptime: number; environment: string } {
    return {
      status: 'ok',
      uptime: Number(process.uptime().toFixed(3)),
      environment: process.env.NODE_ENV ?? 'development',
    };
  }
}

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
              private readonly prisma: PrismaService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('test-data')
  async createTestData() {
    // Tìm hoặc tạo User
    let user = await this.prisma.user.findFirst();
    if (!user) {
      user = await this.prisma.user.create({
        data: { email: 'test@example.com', password: '123' },
      });
    }
    await this.prisma.notification.deleteMany({ where: { userId: user.id } });
    await this.prisma.medicationSchedule.deleteMany({ where: { userId: user.id } });
    // Tạo lịch uống thuốc
    const now = Date.now();
    await this.prisma.medicationSchedule.createMany({
      data: [
        {
          userId: user.id,
          medication: 'Panadol (Sắp uống)',
          timeToTake: new Date(now + 2 * 60000), // 2 phút nữa
          isNotified: false,
          isExpiredNotified: false,
          isTaken: false,
        },
        {
          userId: user.id,
          medication: 'Decolgen (Quên uống)',
          timeToTake: new Date(now - 30 * 60000), // Đã trôi qua ... phút
          isNotified: true, 
          isExpiredNotified: false,
          isTaken: false,
        },
      ],
    });

    const schedules = await this.prisma.medicationSchedule.findMany({
      where: { userId: user.id },
      take: 2,
      orderBy: { id: 'desc' }
    });

    const notifications = await Promise.all(
      schedules.map(schedule => 
        this.prisma.notification.create({
          data: {
            userId: user.id,
            scheduleId: schedule.id, // Gắn đúng ID của từng lịch
            title: '⚠️ Cảnh báo test API',
            body: `Test đánh dấu đã đọc cho thuốc ${schedule.medication}`,
            isRead: false,
          }
        })
      )
    );
    
    return {    
    userId: user.id, // 👈 QUAN TRỌNG

    notificationIds: notifications.map(n => n.id),

    schedules: schedules.map(s => ({
      id: s.id, // 👈 QUAN TRỌNG
      medication: s.medication,
      
    })),
  }
  }
}

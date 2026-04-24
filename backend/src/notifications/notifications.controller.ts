import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Create a new notification.' })
  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @ApiOperation({ summary: 'List notifications with optional filters.' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user UUID.',
  })
  @ApiQuery({
    name: 'isRead',
    required: false,
    description: 'Filter by read state.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum records to return.',
  })
  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('isRead') isRead?: boolean,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;

    return this.notificationsService.findAll({
      userId,
      isRead,
      limit: Number.isNaN(parsedLimit) ? undefined : parsedLimit,
    });
  }

  @ApiOperation({ summary: 'Get notification by id.' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update notification by id.' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(id, updateNotificationDto);
  }

  @ApiOperation({ summary: 'Mark notification as read/unread.' })
  @Patch(':id/read')
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @Body('isRead') isRead?: boolean,
  ) {
    return this.notificationsService.markAsRead(id, isRead ?? true);
  }

  @ApiOperation({ summary: 'Delete notification by id.' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.remove(id);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AddNotificationDto } from './dto/addNotification.dto';
import { Types } from 'mongoose';


@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @UseGuards(JwtAuthGuard)
  @Post('addNotification')
  AddNotification(@Body() addNotificationDto: AddNotificationDto, @Request() req) {
    const userId = req.user?.userId;
    if (!userId) {
      return { message: "Utilisateur non authentifié !" };
    }
    return this.notificationService.addNotification(addNotificationDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('displayNotification')
  displayNotification(@Request() req): Promise<{ notification }> {
    const userId = req.user?.userId;
    return this.notificationService.displayNotification(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('deleteNotification')
  deleteAllNotifications(@Request() req) {
    const userId = req.user?.userId;
    return this.notificationService.deleteAllNotifs(userId);
  }
}
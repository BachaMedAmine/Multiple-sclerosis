// notification.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron('0 8 * * 1') // Every Monday at 8AM
  async handleTestAvailabilityNotification() {
    this.logger.log('Starting weekly test push notifications');

    const users = await this.authService.getAllUsersWithFcmToken(); // Create this if not done

    for (const user of users) {
      try {
        await this.notificationService.sendPushNotification(
          user.fcmToken!,
          '🧠 Weekly Cognitive Test Available!',
          'It’s time to take your weekly MSNQ test.'
        );
      } catch (err) {
        this.logger.error(`Failed to notify user ${user.email}: ${err.message}`);
      }
    }

    this.logger.log(`Sent notifications to ${users.length} users.`);
  }
}

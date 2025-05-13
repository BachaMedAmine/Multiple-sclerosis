import { Injectable } from '@nestjs/common';
import { AddNotificationDto } from './dto/addNotification.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Notification } from './schema/notification.entity';
import { Model } from 'mongoose';
import { User } from 'src/auth/schema/user.schema';


@Injectable()
export class NotificationService {

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @InjectModel(User.name)
    private userModel: Model<User>
  ) { }

  async addNotification(addNotificationDto: AddNotificationDto, userId: string): Promise<{ notification }> {
    const { title, message } = addNotificationDto;

    const notification = await this.notificationModel.create({
      title,
      message,
      user: userId
    });

    return { notification }

  }

  async displayNotification(userId: string): Promise<{ notification: Notification[] }> {
    const findNotifications = await this.notificationModel.find({ user: userId }).sort({createdAt: -1});
    return { notification: findNotifications };
  }

  async deleteAllNotifs(userId: string) {
    await this.notificationModel.deleteMany({user: userId})
    return {message: "All notifications have been deleted !"};
  }
}

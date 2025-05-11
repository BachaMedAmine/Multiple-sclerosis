import { Injectable, NotFoundException } from '@nestjs/common';

import { AddAppointmentDto } from './dto/addAppointment.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './schema/appointment.entity';
import { Model } from 'mongoose';
import { EditAppointmentDto } from './dto/editAppointment.dto';
import { Cron } from '@nestjs/schedule';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { User } from 'src/auth/schema/user.schema';
import { NotificationService } from 'src/notification/notification.service';

const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Firebase Service Account JSON file is missing!");
  process.exit(1);
}

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

@Injectable()
export class AppointmentService {

  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<Appointment>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    private readonly notificationService: NotificationService
  ) { }

  async addAppointment(addAppointmentDto: AddAppointmentDto, userId: string): Promise<{ appointment }> {
    const { fullName, date, phone, status, fcmToken } = addAppointmentDto;

    const initializedStatus = status ?? false;
    const initializedFcmToken = fcmToken ?? "";

    const appointment = await this.appointmentModel.create({
      fullName,
      date,
      phone,
      status: initializedStatus ? "Upcoming" : "Completed",
      fcmToken: initializedFcmToken,
      user: userId
    });

    return { appointment }

  }

  async updateAppointment(appointmentName: string, editAppointmentDto: EditAppointmentDto): Promise<{ appointment }> {
    const { newFullName, newDate, newPhone } = editAppointmentDto;
    const findAppointment = await this.appointmentModel.findOne({ fullName: appointmentName });
    if (!findAppointment) {
      throw new NotFoundException("No such appointment exist !");
    }
    const newAppointment: any = {};
    if (newFullName) {
      newAppointment.fullName = newFullName
    }
    if (newDate) {
      newAppointment.date = newDate
    }
    if (newPhone) {
      newAppointment.phone = newPhone
    }
    const updatedAppointment = await this.appointmentModel.findOneAndUpdate(
      { fullName: findAppointment.fullName },
      { $set: newAppointment },
      { new: true }
    )
    return { appointment: updatedAppointment }
  }

  async cancelAppointment(appointmentName: string): Promise<{ message: string }> {
    const findAppointment = await this.appointmentModel.findOne({ fullName: appointmentName });
    if (!findAppointment) {
      throw new NotFoundException('Appointment not found');
    }

    await findAppointment.updateOne({
      status: "Canceled",
    });

    return { message: "Appointment has been cancelled!" };
  }

  async displayAppointment(userId: string): Promise<{ appointment: Appointment[] }> {
    const findAppointment = await this.appointmentModel.find({ user: userId });

    for (const appointment of findAppointment) {
      if (new Date(appointment.date) < new Date()) {
        await this.appointmentModel.updateOne(
          { _id: appointment._id },
          { $set: { status: "Completed" } }
        );
      }
    }
    const updatedAppointments = await this.appointmentModel.find({ user: userId });

    return { appointment: updatedAppointments };
  }

  @Cron('0 * * * * *')
  async checkTodayAppointments() {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const appointments = await this.appointmentModel.find({
      date: { $gte: today, $lt: tomorrow },
      status: "Upcoming",
    });
    for (const appointment of appointments) {
      if (appointment.fcmToken) {
        await this.sendNotification(appointment.fcmToken, appointment.fullName, appointment.date);
        await this.notificationService.addNotification({ title: "📆 Appointment Reminder", message: `You have an appointment with ${appointment.fullName} !`  }, appointment.user.toString());
      }
    }
  }

  async sendNotification(fcmToken: string, fullName: string, date: Date) {
    const message = {
      notification: {
        title: "📆 Appointment Reminder",
        body: `You have an appointment with ${fullName} !`,
      },
      data: {
        screen: 'displayAppointment'
      },
      android: {
        notification: {
          icon: 'ms_logo',
        }
      },
      token: fcmToken
    };
    try {
      await admin.messaging().send(message);
      console.log("notif send");
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  async updateFcmToken(fullName: string, fcmToken: string): Promise<{ message: string }> {
    const appointment = await this.appointmentModel.findOne({ fullName });
    if (!appointment) {
      throw new NotFoundException("Appointment not found!");
    }
    await this.appointmentModel.updateOne({ fullName }, { $set: { fcmToken } });
    return { message: "FCM Token updated successfully!" };
  }

  

  

  async countAppointments(): Promise<{ message: string }> {
    const findAppointment = await this.appointmentModel.find();
    let upcomingAppointments = 0;
    let canceledAppointments = 0;
    let completedAppointments = 0;
    for (const appointment of findAppointment) {
      if (appointment.status == "Upcoming") {
        upcomingAppointments++;
      } else if (appointment.status == "Canceled") {
        canceledAppointments++;
      } else {
        completedAppointments++;
      }
    }
    return { message: "Upcoming Appointments : " + upcomingAppointments + " | Canceled Appointments : " + canceledAppointments + " | Completed Appointments : " + completedAppointments };
  }
  async getCompletedAppointments(): Promise<{ appointment: Appointment[] }> {
    const completedAppointments = await this.appointmentModel
      .find({ status: "Completed" })
      .sort({ createdAt: -1 }) // Sort by most recent
      .limit(2); // Get only the latest 2

    return { appointment: completedAppointments };
  }

}
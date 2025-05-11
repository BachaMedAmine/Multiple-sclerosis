import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, Put } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AddAppointmentDto } from './dto/addAppointment.dto';
import { EditAppointmentDto } from './dto/editAppointment.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Appointment } from './schema/appointment.entity';


@Controller('appointment')
export class AppointmentController {

  constructor(private readonly appointmentService: AppointmentService) { }

  @UseGuards(JwtAuthGuard)
  @Post('addAppointment')
  AddAppointment(@Body() addAppointmentDto: AddAppointmentDto, @Request() req) {
    const userId = req.user?.userId;
    if (!userId) {
      console.log("❌ L'utilisateur n'est pas défini !");
      return { message: "Utilisateur non authentifié !" };
    }
    return this.appointmentService.addAppointment(addAppointmentDto, userId);
  }

  @Put('updateAppointment/:appointmentName')
  UpdateAppointment(@Param('appointmentName') appointmentName: string, @Body() editAppointmentDto: EditAppointmentDto) {
    return this.appointmentService.updateAppointment(appointmentName, editAppointmentDto);
  }

  @Put('cancelAppointment/:appointmentName')
  async cancelAppointment(@Param('appointmentName') appointmentName: string): Promise<{ message: string }> {
    return this.appointmentService.cancelAppointment(appointmentName);
  }

  @UseGuards(JwtAuthGuard)
  @Get('displayAppointment')
  displayAppointment(@Request() req): Promise<{ appointment }> {
    const userId = req.user?.userId;
    return this.appointmentService.displayAppointment(userId);
  }

  @Put('updateFcmToken')
  async updateFcmToken(@Body() body: { fullName: string, fcmToken: string }) {
    return this.appointmentService.updateFcmToken(body.fullName, body.fcmToken);
  }

  @Get('countAppointments')
  countAppointments(){
    return this.appointmentService.countAppointments();
  }
  @Get('completedAppointments')
  async getCompletedAppointments(): Promise<{ appointment: Appointment[] }> {
    return this.appointmentService.getCompletedAppointments();
  }
}
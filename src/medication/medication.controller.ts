// src/medications/medications.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe
} from '@nestjs/common';
import { MedicationsService } from './medication.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { TakeMedicationDto } from './dto/take-medication.dto';
import { ParseDatePipe } from 'src/common/pipes/parse-date.pipe';
import { MedicationUploadService } from './upload.service';
import { UpdateStockDto } from './dto/update-stock.dto';

@Controller('medications')
@UseGuards(JwtAuthGuard)
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('medicationImage', MedicationUploadService.multerOptions))
  async create(
    @Request() req,
    @Body() createMedicationDto: CreateMedicationDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (typeof createMedicationDto.timeOfDay === 'string') {
      try {
        createMedicationDto.timeOfDay = JSON.parse(createMedicationDto.timeOfDay);
      } catch {
        throw new BadRequestException('Invalid format for timeOfDay');
      }
    }
    if (typeof createMedicationDto.specificDays === 'string') {
      try {
        createMedicationDto.specificDays = JSON.parse(createMedicationDto.specificDays);
      } catch {
        throw new BadRequestException('Invalid format for specificDays');
      }
    }
    if (file) {
      createMedicationDto.imageUrl = `uploads/medications/${file.filename}`;
    }
    return this.medicationsService.create(req.user.userId, createMedicationDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.medicationsService.findAll(req.user.userId);
  }

  @Get('today-reminders')
  getTodayReminders(@Request() req) {
    return this.medicationsService.getTodayReminders(req.user.userId);
  }

  @Get('reminders')
  async getRemindersForDate(
    @Request() req,
    @Query('date') date?: string,
  ) {
    const userId = req.user.userId;
    const targetDate = date ? new Date(date) : new Date();
    return this.medicationsService.getRemindersForDate(userId, targetDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.medicationsService.findOne(id, req.user.userId);
  }

  @Get(':id/history')
  getMedicationHistory(
    @Param('id') id: string,
    @Request() req,
    @Query('startDate', ParseDatePipe) startDate?: Date,
    @Query('endDate', ParseDatePipe) endDate?: Date,
  ) {
    return this.medicationsService.getMedicationHistory(id, req.user.userId, startDate, endDate);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('medicationImage', MedicationUploadService.multerOptions))
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateMedicationDto: UpdateMedicationDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (typeof updateMedicationDto.timeOfDay === 'string') {
      try {
        updateMedicationDto.timeOfDay = JSON.parse(updateMedicationDto.timeOfDay);
      } catch {
        throw new BadRequestException('Invalid format for timeOfDay');
      }
    }
    if (typeof updateMedicationDto.specificDays === 'string') {
      try {
        updateMedicationDto.specificDays = JSON.parse(updateMedicationDto.specificDays);
      } catch {
        throw new BadRequestException('Invalid format for specificDays');
      }
    }
    if (file) {
      updateMedicationDto.imageUrl = `uploads/medications/${file.filename}`;
    }
    return this.medicationsService.update(id, req.user.userId, updateMedicationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.medicationsService.remove(id, req.user.userId);
  }

  @Post(':id/take')
  takeMedication(
    @Param('id') id: string,
    @Request() req,
    @Body() takeMedicationDto: TakeMedicationDto,
  ) {
    return this.medicationsService.takeMedication(id, req.user.userId, takeMedicationDto);
  }

  @Post(':id/skip')
  skipMedication(
    @Param('id') id: string,
    @Request() req,
    @Body('scheduledDate', ParseDatePipe) scheduledDate: Date,
    @Body('scheduledTime') scheduledTime: string,
  ) {
    return this.medicationsService.skipMedication(id, req.user.userId, scheduledDate, scheduledTime);
  }

  @Patch(':id/stock')
  updateStock(
    @Param('id') id: string,
    @Request() req,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.medicationsService.updateStock(id, req.user.userId, updateStockDto);
  }

  @Post(':id/stock/add')
  addStock(
    @Param('id') id: string,
    @Request() req,
    @Body('quantity', new ParseIntPipe()) quantity: number,
    @Body('notes') notes?: string,
  ) {
    return this.medicationsService.addStock(id, req.user.userId, quantity, notes);
  }

  @Get(':id/stock/history')
  getStockHistory(@Param('id') id: string, @Request() req) {
    return this.medicationsService.getStockHistory(id, req.user.userId);
  }

  @Post('fix-reminders')
  fixReminders(@Request() req) {
    return this.medicationsService.fixExistingReminders();
  }

  @Post('test-reminder')
  createTestMedication(@Request() req) {
    return this.medicationsService.createTestMedicationWithReminder(req.user.userId);
  }

  @Get('check-active-reminders')
  checkActiveReminders() {
    return this.medicationsService.checkActiveReminders();
  }
}
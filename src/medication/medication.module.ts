import { Module } from '@nestjs/common';
import { MedicationsService } from './medication.service';
import { MedicationsController } from './medication.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileUploadService } from 'src/auth/fileUpload.service';
import { Medication, MedicationSchema } from './schema/medication.schema';
import { MedicationHistory, MedicationHistorySchema } from './schema/medication-history.schema';
import { Reminder, ReminderSchema } from './schema/reminder.schema';
import { StockHistory, StockHistorySchema } from './schema/stock-history.schema';
import { MedicationUploadService } from './upload.service';

@Module({
  imports: [
    // Register the Medication schema with Mongoose
    MongooseModule.forFeature([
      { name: Medication.name, schema: MedicationSchema },
      { name: MedicationHistory.name, schema: MedicationHistorySchema },
      { name: Reminder.name, schema: ReminderSchema },
      { name: StockHistory.name, schema: StockHistorySchema }
    ]),
    // Optionally include JwtModule if authentication is required for medication endpoints
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '5m' },
      }),
    }),
  ],
  controllers: [MedicationsController],
  providers: [MedicationsService, FileUploadService, MedicationUploadService], // Add FileUploadService and MedicationUploadService if handling photo uploads
  exports: [MedicationsService], // Optional: export the service if other modules need it
})

export class MedicationModule {}
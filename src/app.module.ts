import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsModule } from './news/news.module';
import { AppointmentModule } from './appointment/appointment.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ActivityModule } from './activity/activity.module';
import { HistoriqueModule } from './historique/historique.module';
import { HttpModule } from '@nestjs/axios';
import { QuestionnaireModule } from './questionnaire/questionnaire.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MedicationModule } from './medication/medication.module';
import { PythonRunnerService } from './ai_model/python-runner.service';
import { NotificationModule } from './notification/notification.module';
import { AssistantModule } from './assistant/assistant.module';


@Module({
imports: [
ConfigModule.forRoot({
envFilePath: '.env',
isGlobal: true,
}),
AssistantModule,
MongooseModule.forRootAsync({
imports: [ConfigModule],
inject: [ConfigService],
useFactory: (configService: ConfigService) => {
const host = configService.get<string>('DB_HOST');
const port = configService.get<string>('DB_PORT');
const dbName = configService.get<string>('DB_NAME');
const user = configService.get<string>('DB_USER');
const pass = configService.get<string>('DB_PASS');

const credentials = user && pass ? `${user}:${pass}@` : '';
const uri = `mongodb://${credentials}${host}:${port}/${dbName}`;

return { uri };
},
}),
AuthModule,
NewsModule,
ScheduleModule.forRoot(),
AppointmentModule,
ActivityModule,
HistoriqueModule,
QuestionnaireModule,
NotificationsModule,
MedicationModule,
NotificationModule, // Add this line
],
controllers: [AppController],
providers: [AppService,
PythonRunnerService],
})
export class AppModule implements OnModuleInit {
    constructor(private readonly pythonRunner: PythonRunnerService) {}
    
    onModuleInit() {
    this.pythonRunner.startAiModelServer();
    this.pythonRunner.startClassifierServer();
    this.pythonRunner.startRegressorServer();
    }
    }
    
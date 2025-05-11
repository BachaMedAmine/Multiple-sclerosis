import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { HistoriqueService } from './historique.service';
import { HistoriqueController } from './historique.controller';
import { Historique, HistoriqueSchema } from './schema/historique.entity';
import { FileUploadService } from 'src/auth/fileUpload.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PainCheckService } from './pain-check.service';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    MongooseModule.forFeature([{ name: Historique.name, schema: HistoriqueSchema }]),
    HttpModule,
    NotificationModule,
  ],
  controllers: [HistoriqueController],
  providers: [HistoriqueService, FileUploadService, PainCheckService], // 🔹 Ajout du service ici
})
export class HistoriqueModule {}


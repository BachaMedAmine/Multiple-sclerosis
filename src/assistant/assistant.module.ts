import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { AssistantContextService } from './assistant-context.service';
import { OpenAIService } from './openai.service';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from 'src/auth/schema/user.schema';
import { Appointment, AppointmentSchema } from 'src/appointment/schema/appointment.entity';
import { Historique, HistoriqueSchema } from 'src/historique/schema/historique.entity';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Historique.name, schema: HistoriqueSchema },
    ]),
  ],
  controllers: [AssistantController],
  providers: [AssistantContextService, OpenAIService],
})
export class AssistantModule {}
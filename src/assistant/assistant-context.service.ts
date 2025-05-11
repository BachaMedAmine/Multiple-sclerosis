// assistant-context.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment } from 'src/appointment/schema/appointment.entity';
import { User, UserDocument } from 'src/auth/schema/user.schema';
import { Historique } from 'src/historique/schema/historique.entity';



@Injectable()
export class AssistantContextService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Appointment.name) private readonly appointmentModel: Model<Appointment>,
    @InjectModel(Historique.name) private readonly historiqueModel: Model<Historique>,
  ) {}

  async buildContextSummary(userId: string): Promise<string> {
    const user = await this.userModel.findById(userId).lean();
  
    if (!user) {
      throw new Error(`Utilisateur avec l'ID ${userId} introuvable.`);
    }
  
    const appointments = await this.appointmentModel
      .find({ user: userId, status: 'Upcoming' })
      .sort({ date: 1 })
      .limit(3)
      .lean();
  
    const douleurs = await this.historiqueModel
      .find({ user: userId, isActive: true })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
  
    const profilePart = `
  Profil :
  - Nom : ${user.fullName}
  - Âge : ${user.birthday ? new Date().getFullYear() - new Date(user.birthday).getFullYear() : 'Inconnu'}
  - Type de SEP : ${user.type || 'Non précisé'}
  - Diagnostic : ${user.diagnosis || 'Non précisé'}
  `;
  
    const rdvPart = appointments.length
      ? `Rendez-vous à venir :\n` + appointments.map(rdv =>
          `- ${rdv.fullName} : ${new Date(rdv.date).toLocaleString()}`
        ).join('\n')
      : `Rendez-vous à venir :\n- Aucun`;
  
    const douleursPart = douleurs.length
      ? `Douleurs récentes :\n` + douleurs.map(d => {
          const startDate = d.startTime || d.createdAt;
          const formattedDate = startDate ? new Date(startDate).toLocaleString() : 'Date inconnue';
          return `- ${d.bodyPartName || 'Zone inconnue'} (${d.generatedDescription?.fr || 'Description manquante'}) depuis le ${formattedDate}`;
        }).join('\n')
      : `Douleurs récentes :\n- Aucune signalée récemment`;
  
    return `${profilePart.trim()}\n\n${douleursPart}\n\n${rdvPart}`;
  }
}
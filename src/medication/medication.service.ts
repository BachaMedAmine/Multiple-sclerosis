// src/medications/medications.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Medication } from './schema/medication.schema';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { User } from 'src/auth/schema/user.schema';
import { MedicationHistory } from './schema/medication-history.schema';
import { Reminder } from './schema/reminder.schema';
import { TakeMedicationDto } from './dto/take-medication.dto';
import * as moment from 'moment';
import { StockHistory } from './schema/stock-history.schema';
import { UpdateStockDto } from './dto/update-stock.dto';


@Injectable()
export class MedicationsService {
  constructor(
    @InjectModel(Medication.name) private medicationModel: Model<Medication>,
    @InjectModel(MedicationHistory.name) private medicationHistoryModel: Model<MedicationHistory>,
    @InjectModel(Reminder.name) private reminderModel: Model<Reminder>,
    @InjectModel(StockHistory.name) private stockHistoryModel: Model<StockHistory>,
  ) { }

  async create(userId: any, createMedicationDto: CreateMedicationDto): Promise<Medication> {
    console.log('User ID reÃ§u:', userId);

    const medication = new this.medicationModel({
      ...createMedicationDto,
      userId: userId,
    });

    const newMedication = await medication.save();

    // Generate reminders based on medication schedule
    await this.generateReminders(newMedication);

    // Configuration pour les rappels qui ont lieu bientÃ´t (aujourd'hui)
    this.setupAutomaticRemindersForNewMedication(newMedication);

    return newMedication;
  }

  private translateField(field: any, lang: 'fr' | 'en' = 'fr'): string {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field['fr'] || '';
  }

  async findAll(userId: string, lang: 'fr' | 'en' = 'fr'): Promise<any[]> {
    const meds = await this.medicationModel.find({ userId, isActive: true }).lean().exec();
    return meds.map((m) => ({
      ...m,
      name: this.translateField(m.name, lang),
      description: this.translateField(m.description, lang),
      notes: this.translateField(m.notes, lang),
    }));
  }

  async findOne(id: string, userId: string): Promise<Medication> {
    const medication = await this.medicationModel.findOne({ _id: id, userId }).exec();
    if (!medication) {
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }
    return medication;
  }

  async update(id: string, userId: string, updateMedicationDto: UpdateMedicationDto): Promise<Medication> {
    // Trouver d'abord le mÃ©dicament existant
    const existingMedication = await this.medicationModel.findOne({ _id: id, userId }).exec();

    if (!existingMedication) {
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }

    // Supprimer TOUS les rappels futurs (aujourd'hui inclus)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.reminderModel.deleteMany({
      medicationId: id,
      scheduledDate: { $gte: today }
    }).exec();

    // Mettre Ã  jour le mÃ©dicament
    const medication = await this.medicationModel.findOneAndUpdate(
      { _id: id, userId },
      updateMedicationDto,
      { new: true },
    ).exec();

    if (!medication) {
      throw new NotFoundException(`Medication not found after update`);
    }

    // GÃ©nÃ©rer les nouveaux rappels pour tous les jours futurs
    await this.generateReminders(medication);

    return medication;
  }

  
  async remove(id: string, userId: string): Promise<{ message: string }> {
    // VÃ©rifier si le mÃ©dicament existe et appartient Ã  l'utilisateur
    const medication = await this.medicationModel.findOne({ _id: id, userId }).exec();

    if (!medication) {
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }

    // 1. Supprimer tous les reminders associÃ©s Ã  ce mÃ©dicament
    const remindersDeleted = await this.reminderModel.deleteMany({ medicationId: id }).exec();

    // 2. Supprimer l'historique de prise de mÃ©dicament
    const medicationHistoryDeleted = await this.medicationHistoryModel.deleteMany({ medicationId: id }).exec();

    // 3. Supprimer l'historique des stocks
    const stockHistoryDeleted = await this.stockHistoryModel.deleteMany({ medicationId: id }).exec();

    // 4. Supprimer (ou dÃ©sactiver) le mÃ©dicament lui-mÃªme
    // Option 1: DÃ©sactivation (soft delete)
    const result = await this.medicationModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).exec();

    // Option 2: Suppression complÃ¨te - dÃ©commentez la ligne suivante pour supprimer complÃ¨tement
    // await this.medicationModel.findByIdAndDelete(id).exec();

    console.log(`MÃ©dicament supprimÃ© avec succÃ¨s. DonnÃ©es nettoyÃ©es:
    - ${remindersDeleted.deletedCount} rappels supprimÃ©s
    - ${medicationHistoryDeleted.deletedCount} entrÃ©es d'historique de prise supprimÃ©es
    - ${stockHistoryDeleted.deletedCount} entrÃ©es d'historique de stock supprimÃ©es`);

    return {
      message: `MÃ©dicament "${medication.name}" supprimÃ© avec succÃ¨s et toutes les donnÃ©es associÃ©es ont Ã©tÃ© nettoyÃ©es.`
    };
  }

  async takeMedication(id: string, userId: string, takeMedicationDto: TakeMedicationDto): Promise<MedicationHistory> {
    const medication = await this.findOne(id, userId);

    // Update stock
    const quantityTaken = takeMedicationDto.quantityTaken || medication.dosageQuantity;
    const previousStock = medication.currentStock;

    if (medication.currentStock > 0) {
      const newStock = medication.currentStock - quantityTaken;
      const updatedStock = newStock >= 0 ? newStock : 0;

      await this.medicationModel.updateOne(
        { _id: id },
        { currentStock: updatedStock }
      ).exec();

      // Ajouter l'historique de stock
      await this.stockHistoryModel.create({
        medicationId: id,
        previousStock,
        newStock: updatedStock,
        changeAmount: -quantityTaken,
        type: 'take',
        userId
      });

      // VÃ©rifier le stock faible aprÃ¨s la prise
      const updatedMedication = await this.medicationModel.findById(id).exec();
      if (updatedMedication) {
        await this.checkLowStockForMedication(updatedMedication);
      }
    }

    // Find relevant reminder and mark as completed
    const takenDate = moment(takeMedicationDto.takenAt).startOf('day');
    const takenTime = moment(takeMedicationDto.takenAt).format('HH:mm');

    // Find the closest reminder to the taken time
    const todayReminders = await this.reminderModel.find({
      medicationId: id,
      userId,
      scheduledDate: {
        $gte: takenDate.clone().startOf('day').toDate(),
        $lte: takenDate.clone().endOf('day').toDate()
      },
      isCompleted: false,
      isSkipped: false
    }).exec();

    if (todayReminders.length > 0) {
      // Find closest reminder by time
      let closestReminder = todayReminders[0];
      let smallestDiff = Math.abs(
        moment(takenTime, 'HH:mm').diff(moment(closestReminder.scheduledTime, 'HH:mm'))
      );

      for (const reminder of todayReminders) {
        const diff = Math.abs(
          moment(takenTime, 'HH:mm').diff(moment(reminder.scheduledTime, 'HH:mm'))
        );
        if (diff < smallestDiff) {
          smallestDiff = diff;
          closestReminder = reminder;
        }
      }

      // Mark reminder as completed
      await this.reminderModel.updateOne(
        { _id: closestReminder._id },
        { isCompleted: true, completedAt: takenDate.toDate() }
      ).exec();
    }

    // Create medication history entry
    const medicationHistory = new this.medicationHistoryModel({
      medicationId: id,
      takenAt: takeMedicationDto.takenAt,
      quantityTaken,
      notes: takeMedicationDto.notes || '',
      scheduledTime: todayReminders.length > 0 ? todayReminders[0].scheduledTime : takenTime
    });

    return medicationHistory.save();
  }

  async skipMedication(id: string, userId: string, scheduledDate: Date, scheduledTime: string): Promise<Reminder> {
    const reminderDate = moment(scheduledDate).startOf('day');
    const reminder = await this.reminderModel.findOne({
      medicationId: id,
      userId,
      scheduledDate: {
        $gte: reminderDate.clone().startOf('day').toDate(),
        $lte: reminderDate.clone().endOf('day').toDate()
      },
      scheduledTime,
      isCompleted: false,
      isSkipped: false
    }).exec();

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    reminder.isSkipped = true;
    await reminder.save();

    // Create skipped medication history
    const medicationHistory = new this.medicationHistoryModel({
      medicationId: id,
      takenAt: new Date(),
      skipped: true,
      scheduledTime
    });
    await medicationHistory.save();

    return reminder;
  }

  async getTodayReminders(userId: string, lang: 'fr' | 'en' = 'fr'): Promise<any[]> {
  const today = moment().startOf('day');
  const reminders = await this.reminderModel
    .find({
      userId,
      scheduledDate: {
        $gte: today.clone().toDate(),
        $lte: today.clone().endOf('day').toDate(),
      },
      isCompleted: false,
      isSkipped: false,
    })
    .populate('medicationId')
    .sort({ scheduledTime: 1 })
    .lean()
    .exec();

  return reminders.map((reminder) => ({
    ...reminder,
    message: this.translateField(reminder.message, lang),
    medication: {
      ...reminder.medicationId,
      name: this.translateField(reminder.medicationId?.name, lang),
      description: this.translateField(reminder.medicationId?.description, lang),
    },
  }));
}


async getRemindersForDate(userId: string, date: Date, lang: 'fr' | 'en' = 'fr'): Promise<any[]> {
  const start = moment(date).startOf('day').toDate();
  const end = moment(date).endOf('day').toDate();

  const reminders = await this.reminderModel
    .find({
      userId,
      scheduledDate: { $gte: start, $lte: end },
      isCompleted: false,
      isSkipped: false,
    })
    .populate('medicationId')
    .sort({ scheduledTime: 1 })
    .lean()
    .exec();

  return reminders.map((reminder) => ({
    ...reminder,
    message: this.translateField(reminder.message, lang),
    medication: {
      ...reminder.medicationId,
      name: this.translateField(reminder.medicationId?.name, lang),
      description: this.translateField(reminder.medicationId?.description, lang),
    },
  }));
}

async getMedicationHistory(
  id: string,
  userId: string,
  startDate?: Date,
  endDate?: Date,
  lang: 'fr' | 'en' = 'fr'
): Promise<any[]> {
  await this.findOne(id, userId);

  const query: any = { medicationId: id };
  if (startDate || endDate) {
    query.takenAt = {};
    if (startDate) query.takenAt.$gte = startDate;
    if (endDate) query.takenAt.$lte = endDate;
  }

  const history = await this.medicationHistoryModel
    .find(query)
    .sort({ takenAt: -1 })
    .lean()
    .exec();

  return history.map((h) => ({
    ...h,
    notes: this.translateField(h.notes, lang),
  }));
}

  private async generateReminders(medication: Medication): Promise<void> {
    const { _id, userId, frequencyType, specificDays, timeOfDay, startDate, endDate } = medication;
    const today = moment().startOf('day');
    const start = startDate ? moment(startDate).startOf('day') : today;
    const end = endDate ? moment(endDate).startOf('day') : moment(today).add(30, 'days');

    if (end.isBefore(start)) {
      throw new BadRequestException('End date cannot be before start date');
    }

    // Define the structure of a reminder
    interface Reminder {
      medicationId: string | unknown;
      userId: User;
      scheduledDate: Date;
      scheduledTime: string;
      message: string;
    }

    const reminders: Reminder[] = [];

    let currentDate = moment(start);

    while (currentDate.isSameOrBefore(end)) {
      const dayOfWeek = currentDate.day(); // 0 = Sunday, 1 = Monday, etc.
      const dayOfMonth = currentDate.date(); // 1-31

      let shouldAddReminder = false;

      switch (frequencyType) {
        case 'daily':
          shouldAddReminder = true;
          break;
        case 'weekly':
          shouldAddReminder = specificDays.includes(dayOfWeek);
          break;
        case 'monthly':
          shouldAddReminder = specificDays.includes(dayOfMonth);
          break;
        case 'specific_days':
          // Specific days should already be handled by the 'weekly' and 'monthly' cases
          break;
      }

      if (shouldAddReminder) {
        for (const time of timeOfDay) {
          reminders.push({
            medicationId: _id,
            userId,
            // Garantir que la date est toujours Ã  minuit UTC
            scheduledDate: currentDate.clone().startOf('day').toDate(),
            scheduledTime: time,
            message: `Time to take ${medication.name}`,
          });
        }
      }

      currentDate.add(1, 'day');
    }

    if (reminders.length > 0) {
      await this.reminderModel.insertMany(reminders);
    }
  }

  // MÃ©thode pour scanner tous les mÃ©dicaments avec un stock faible
  async scanLowStockMedications(): Promise<void> {
    // Find medications with low stock
    const lowStockMedications = await this.medicationModel.find({
      isActive: true,
      notifyLowStock: true,
      currentStock: { $gt: 0, $lte: { $ref: 'lowStockThreshold' } }
    }).exec();

    // Ici, vous pouvez implÃ©menter la logique de notification
    console.log('Medications that need refills:', lowStockMedications);

    // Pour chaque mÃ©dicament, vous pourriez envoyer une notification
    for (const medication of lowStockMedications) {
      // Logique de notification
    }
  }

  // Nouvelles mÃ©thodes pour la gestion du stock
  async updateStock(id: string, userId: string, updateStockDto: UpdateStockDto): Promise<Medication> {
    const medication = await this.findOne(id, userId);
    if (!medication) {
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }

    const previousStock = medication.currentStock;
    const changeAmount = updateStockDto.quantity - previousStock;

    // Mettre Ã  jour le stock et le seuil si fourni
    const updateData: any = { currentStock: updateStockDto.quantity };
    if (updateStockDto.lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = updateStockDto.lowStockThreshold;
    }

    const updatedMedication = await this.medicationModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).exec();

    if (!updatedMedication) {
      throw new NotFoundException(`Failed to update medication stock`);
    }

    // CrÃ©er un historique de stock
    await this.stockHistoryModel.create({
      medicationId: id,
      previousStock,
      newStock: updateStockDto.quantity,
      changeAmount,
      notes: updateStockDto.notes,
      type: changeAmount > 0 ? 'add' : 'adjustment',
      userId
    });

    // VÃ©rifier le stock faible
    await this.checkLowStockForMedication(updatedMedication);

    return updatedMedication;
  }

  async addStock(id: string, userId: string, quantity: number, notes?: string): Promise<Medication> {
    const medication = await this.findOne(id, userId);
    if (!medication) {
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }

    const previousStock = medication.currentStock;
    const newStock = previousStock + quantity;

    const updatedMedication = await this.medicationModel.findByIdAndUpdate(
      id,
      { currentStock: newStock },
      { new: true }
    ).exec();

    if (!updatedMedication) {
      throw new NotFoundException(`Failed to add medication stock`);
    }

    // CrÃ©er un historique de stock
    await this.stockHistoryModel.create({
      medicationId: id,
      previousStock,
      newStock,
      changeAmount: quantity,
      notes,
      type: 'add',
      userId
    });

    return updatedMedication;
  }

  async getStockHistory(id: string, userId: string): Promise<StockHistory[]> {
    await this.findOne(id, userId); // VÃ©rifier l'accÃ¨s
    return this.stockHistoryModel.find({ medicationId: id })
      .sort({ createdAt: -1 })
      .exec();
  }

  // MÃ©thode unique pour vÃ©rifier le stock faible d'un mÃ©dicament spÃ©cifique
  private async checkLowStockForMedication(medication: Medication): Promise<void> {
    if (!medication.notifyLowStock || !medication.lowStockThreshold) {
      return;
    }

    const isLowStock = medication.currentStock <= medication.lowStockThreshold;

    if (isLowStock) {
      // Ici, vous pouvez implÃ©menter la logique de notification
      console.log(`Low stock alert for medication ${medication.name}: ${medication.currentStock} units remaining`);

      // Vous pourriez appeler un service de notification ici
      // await this.notificationService.sendLowStockAlert({
      //   userId: medication.userId,
      //   medicationName: medication.name,
      //   currentStock: medication.currentStock,
      //   threshold: medication.lowStockThreshold
      // });
    }
  }

  // Nouvelle mÃ©thode pour corriger les dates des reminders existants
  async fixExistingReminders(): Promise<{ message: string, count: number }> {
    // RÃ©cupÃ©rer tous les reminders non complÃ©tÃ©s et non ignorÃ©s
    const reminders = await this.reminderModel.find({
      isCompleted: false,
      isSkipped: false
    }).exec();

    let updatedCount = 0;

    // Pour chaque reminder, s'assurer que scheduledDate est Ã  minuit UTC
    for (const reminder of reminders) {
      const originalDate = moment(reminder.scheduledDate);
      const correctedDate = originalDate.clone().startOf('day');

      // Si la date n'est pas dÃ©jÃ  Ã  minuit UTC (00:00:00.000Z)
      if (originalDate.format('HH:mm:ss.SSS') !== '00:00:00.000') {
        reminder.scheduledDate = correctedDate.toDate();
        await reminder.save();
        updatedCount++;
      }
    }

    return {
      message: `Fixed ${updatedCount} reminders with incorrect date format.`,
      count: updatedCount
    };
  }

  // MÃ©thode de test pour crÃ©er un mÃ©dicament avec un reminder proche
  async createTestMedicationWithReminder(userId: string): Promise<{ medication: Medication, nextReminder: Date }> {
    // Heure actuelle + 2 minutes
    const now = new Date();
    const minutes = now.getMinutes();
    const nextReminderMinutes = (minutes + 2) % 60; // +2 minutes
    const nextReminderHour = minutes + 2 >= 60 ? (now.getHours() + 1) % 24 : now.getHours();
    const reminderTime = `${nextReminderHour.toString().padStart(2, '0')}:${nextReminderMinutes.toString().padStart(2, '0')}`;

    console.log(`CrÃ©ation d'un rappel de test pour ${reminderTime}`);

    // CrÃ©er un mÃ©dicament de test
    const testMedication = new this.medicationModel({
      name: 'Test Reminder',
      description: 'MÃ©dicament de test pour les notifications',
      medicationType: 'pill',
      frequencyType: 'daily',
      timeOfDay: [reminderTime],
      dosageQuantity: 1,
      dosageUnit: 'mg',
      currentStock: 10,
      userId: userId
    });

    const savedMedication = await testMedication.save();

    // GÃ©nÃ©rer le reminder
    await this.generateReminders(savedMedication);

    // Date de rappel pour information
    const nextReminderDate = new Date();
    nextReminderDate.setHours(nextReminderHour, nextReminderMinutes, 0, 0);

    console.log(`MÃ©dicament test crÃ©Ã© avec succÃ¨s. Prochain rappel prÃ©vu Ã  ${nextReminderDate.toLocaleTimeString()}`);

    // Mettre en place une vÃ©rification automatique
    this.setupAutomaticReminderCheck(savedMedication._id as string, nextReminderDate);

    return {
      medication: savedMedication,
      nextReminder: nextReminderDate
    };
  }

  // Configuration de la vÃ©rification automatique des rappels
  private setupAutomaticReminderCheck(medicationId: string, reminderTime: Date): void {
    console.log(`Configuration de la vÃ©rification automatique pour le rappel Ã  ${reminderTime.toLocaleTimeString()}`);

    // Calculer le dÃ©lai jusqu'au reminder en millisecondes
    const now = new Date();
    const delay = reminderTime.getTime() - now.getTime();

    if (delay <= 0) {
      console.log('Le rappel est dÃ©jÃ  passÃ©, pas de vÃ©rification automatique configurÃ©e.');
      return;
    }

    console.log(`La vÃ©rification sera effectuÃ©e dans ${Math.round(delay / 1000)} secondes`);

    // Configurer un timeout pour vÃ©rifier le rappel Ã  l'heure prÃ©vue
    setTimeout(async () => {
      try {
        console.log(`\n=== VÃ‰RIFICATION AUTOMATIQUE DU RAPPEL (${new Date().toLocaleTimeString()}) ===`);

        // RÃ©cupÃ©rer le mÃ©dicament
        const medication = await this.medicationModel.findById(medicationId).exec();
        if (!medication) {
          console.log('MÃ©dicament non trouvÃ©, peut-Ãªtre supprimÃ©.');
          return;
        }

        // RÃ©cupÃ©rer le reminder actif
        const today = moment().startOf('day');
        const reminders = await this.reminderModel.find({
          medicationId,
          scheduledDate: {
            $gte: today.clone().startOf('day').toDate(),
            $lte: today.clone().endOf('day').toDate()
          },
          isCompleted: false,
          isSkipped: false
        }).exec();

        if (reminders.length === 0) {
          console.log('Aucun rappel actif trouvÃ© pour ce mÃ©dicament.');
          return;
        }

        // Trouver le reminder le plus proche de l'heure actuelle
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        let closestReminder = reminders[0];
        let smallestDiff = Infinity;

        for (const reminder of reminders) {
          const [hour, minute] = reminder.scheduledTime.split(':').map(num => parseInt(num));
          const timeDiff = Math.abs((hour * 60 + minute) - (currentHour * 60 + currentMinute));

          if (timeDiff < smallestDiff) {
            smallestDiff = timeDiff;
            closestReminder = reminder;
          }
        }

        console.log(`Rappel trouvÃ©: ${medication.name} Ã  ${closestReminder.scheduledTime}`);
        console.log(`!!! NOTIFICATION: C'est l'heure de prendre ${medication.name} !!!`);

        // Autre vÃ©rification dans 1 minute pour voir si le rappel a Ã©tÃ© pris ou ignorÃ©
        setTimeout(async () => {
          const refreshedReminder = await this.reminderModel.findById(closestReminder._id).exec();
          if (!refreshedReminder) {
            console.log('Rappel non trouvÃ©, peut-Ãªtre supprimÃ©.');
            return;
          }

          if (refreshedReminder.isCompleted) {
            console.log(`Le mÃ©dicament ${medication.name} a Ã©tÃ© marquÃ© comme pris.`);
          } else if (refreshedReminder.isSkipped) {
            console.log(`Le mÃ©dicament ${medication.name} a Ã©tÃ© ignorÃ©.`);
          } else {
            console.log(`Le mÃ©dicament ${medication.name} est toujours en attente de prise.`);
          }

          console.log(`=== FIN DE LA VÃ‰RIFICATION AUTOMATIQUE ===\n`);
        }, 60000);

      } catch (error) {
        console.error('Erreur lors de la vÃ©rification automatique du rappel:', error);
      }
    }, delay);
  }

  // MÃ©thode pour vÃ©rifier et afficher les reminders actifs (pour test)
  async checkActiveReminders(): Promise<void> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    console.log(`VÃ©rification des rappels actifs Ã  ${currentTimeString}`);

    const today = moment().startOf('day');
    const reminders = await this.reminderModel.find({
      scheduledDate: {
        $gte: today.clone().startOf('day').toDate(),
        $lte: today.clone().endOf('day').toDate()
      },
      isCompleted: false,
      isSkipped: false
    }).populate('medicationId').exec();

    console.log(`${reminders.length} rappels trouvÃ©s pour aujourd'hui`);

    for (const reminder of reminders) {
      console.log(`- Rappel pour "${reminder.medicationId['name']}" Ã  ${reminder.scheduledTime}`);
      const [hour, minute] = reminder.scheduledTime.split(':').map(num => parseInt(num));

      // VÃ©rifier si c'est l'heure du rappel (Ã  1 minute prÃ¨s)
      if (currentHour === hour && Math.abs(currentMinute - minute) <= 1) {
        console.log(`!!! NOTIFICATION: C'est l'heure de prendre ${reminder.medicationId['name']} !!!`);
      }
    }
  }

  // MÃ©thode pour configurer la vÃ©rification automatique des rappels pour un nouveau mÃ©dicament
  private async setupAutomaticRemindersForNewMedication(medication: Medication): Promise<void> {
    try {
      const today = moment().startOf('day');
      const tomorrow = moment().add(1, 'day').startOf('day');

      // RÃ©cupÃ©rer les rappels crÃ©Ã©s pour aujourd'hui
      const todayReminders = await this.reminderModel.find({
        medicationId: medication._id,
        scheduledDate: {
          $gte: today.toDate(),
          $lt: tomorrow.toDate()
        },
        isCompleted: false,
        isSkipped: false
      }).exec();

      console.log(`VÃ©rification des rappels pour le mÃ©dicament ${medication.name} (${todayReminders.length} rappels aujourd'hui)`);

      if (todayReminders.length === 0) {
        console.log(`Aucun rappel prÃ©vu aujourd'hui pour ${medication.name}`);
        return;
      }

      // Pour chaque rappel d'aujourd'hui, configurer une vÃ©rification automatique
      for (const reminder of todayReminders) {
        const now = new Date();
        const [reminderHour, reminderMinute] = reminder.scheduledTime.split(':').map(num => parseInt(num));

        // CrÃ©er une date pour l'heure du rappel aujourd'hui
        const reminderTime = new Date();
        reminderTime.setHours(reminderHour, reminderMinute, 0, 0);

        // Calculer le dÃ©lai jusqu'au rappel
        const delay = reminderTime.getTime() - now.getTime();

        if (delay <= 0) {
          console.log(`Le rappel pour ${medication.name} Ã  ${reminder.scheduledTime} est dÃ©jÃ  passÃ© pour aujourd'hui`);
          continue;
        }

        console.log(`Rappel pour ${medication.name} configurÃ© Ã  ${reminder.scheduledTime} (dans ${Math.round(delay / 60000)} minutes)`);

        // Configurer un timeout pour ce rappel
        setTimeout(async () => {
          try {
            console.log(`\n=== NOTIFICATION DE RAPPEL (${new Date().toLocaleTimeString()}) ===`);
            console.log(`!!! C'est l'heure de prendre ${medication.name} (${reminder.scheduledTime}) !!!`);

            // VÃ©rification une minute plus tard
            setTimeout(async () => {
              const refreshedReminder = await this.reminderModel.findById(reminder._id).exec();
              if (!refreshedReminder) {
                console.log('Rappel non trouvÃ©, peut-Ãªtre supprimÃ©.');
                return;
              }

              if (refreshedReminder.isCompleted) {
                console.log(`Le mÃ©dicament ${medication.name} a Ã©tÃ© marquÃ© comme pris.`);
              } else if (refreshedReminder.isSkipped) {
                console.log(`Le mÃ©dicament ${medication.name} a Ã©tÃ© ignorÃ©.`);
              } else {
                console.log(`Le mÃ©dicament ${medication.name} est toujours en attente de prise.`);
              }

              console.log(`=== FIN DE LA NOTIFICATION DE RAPPEL ===\n`);
            }, 60000);

          } catch (error) {
            console.error('Erreur lors de la notification de rappel:', error);
          }
        }, delay);
      }
    } catch (error) {
      console.error('Erreur lors de la configuration des rappels automatiques:', error);
    }
  }
}
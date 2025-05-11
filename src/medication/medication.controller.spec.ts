import { Test, TestingModule } from '@nestjs/testing';
import { MedicationsController } from './medication.controller';
import { MedicationsService } from './medication.service';

describe('MedicationController', () => {
  let controller: MedicationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedicationsController],
      providers: [MedicationsService],
    }).compile();

    controller = module.get<MedicationsController>(MedicationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

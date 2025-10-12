import { Test, TestingModule } from '@nestjs/testing';
import { PipelinesController } from './pipelines.controller';
import { PipelinesService } from './pipelines.service';

describe('PipelinesController', () => {
  let controller: PipelinesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PipelinesController],
      providers: [PipelinesService],
    }).compile();

    controller = module.get<PipelinesController>(PipelinesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

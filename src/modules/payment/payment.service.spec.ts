import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { PaymentProducer } from '../../queue/producers/payment.producer';
import { PaymentModel } from '../../database/models/payment.model';
import { PaymentStatus, PaymentCurrency } from '../../utils/constants/enum';

describe('PaymentService', () => {
  let service: PaymentService;
  let repository: PaymentRepository;
  let producer: PaymentProducer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PaymentRepository,
          useValue: {
            findByIdempotencyKey: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: PaymentProducer,
          useValue: {
            enqueuePayment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    repository = module.get<PaymentRepository>(PaymentRepository);
    producer = module.get<PaymentProducer>(PaymentProducer);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiatePayment', () => {
    it('should return existing payment if idempotency key exists', async () => {
      const mockPayment = { id: '123', idempotencyKey: 'key' } as PaymentModel;
      jest.spyOn(repository, 'findByIdempotencyKey').mockResolvedValue(mockPayment);

      const result = await service.initiatePayment({ amount: 100, currency: PaymentCurrency.USD } as any, 'key');

      expect(result).toBe(mockPayment);
      expect(producer.enqueuePayment).not.toHaveBeenCalled();
    });

    it('should create and enqueue payment if key does not exist', async () => {
      const mockPayment = { id: '123', status: PaymentStatus.PENDING } as PaymentModel;
      jest.spyOn(repository, 'findByIdempotencyKey').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockResolvedValue(mockPayment);

      const result = await service.initiatePayment({ amount: 100 } as any, 'key');

      expect(result).toBe(mockPayment);
      expect(repository.create).toHaveBeenCalled();
      expect(producer.enqueuePayment).toHaveBeenCalledWith('123');
    });
  });
});

import { PaymentHandler } from '../src/services/PaymentHandler';
import { MonadClient } from '../src/services/MonadClient';
import { AuthService } from '../src/services/AuthService';
import { PaymentRequest } from '../src/services/PaymentRequest';

describe('PaymentHandler', () => {
  let paymentHandler: PaymentHandler;
  let mockMonad: jest.Mocked<MonadClient>;
  let mockAuth: jest.Mocked<AuthService>;
  let mockRequestService: jest.Mocked<PaymentRequest>;

  beforeEach(() => {
    mockMonad = {
      getRequest: jest.fn(),
      transferUSDC: jest.fn(),
      updateRequestStatus: jest.fn(),
    } as any;

    mockAuth = {
      verifyBiometric: jest.fn(),
    } as any;

    mockRequestService = {
      validate: jest.fn(),
    } as any;

    paymentHandler = new PaymentHandler(mockMonad, mockAuth, mockRequestService);
  });

  it('should process a valid payment', async () => {
    mockAuth.verifyBiometric.mockResolvedValue(true);
    mockRequestService.validate.mockResolvedValue(true);
    mockMonad.getRequest.mockResolvedValue({
      from: '0xFreelancer',
      amount: 500,
    });

    await paymentHandler.processPayment(
      'req_123',
      '0xClient',
      'biometricProof'
    );

    expect(mockMonad.transferUSDC).toHaveBeenCalledWith(
      '0xClient',
      '0xFreelancer',
      500
    );
    expect(mockMonad.updateRequestStatus).toHaveBeenCalledWith(
      'req_123',
      'COMPLETED'
    );
  });

  it('should reject invalid requests', async () => {
    mockRequestService.validate.mockResolvedValue(false);

    await expect(
      paymentHandler.processPayment('req_123', '0xClient', 'biometricProof')
    ).rejects.toThrow('Invalid or expired request');
  });
});

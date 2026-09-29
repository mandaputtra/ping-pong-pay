import { PaymentRequest } from '../src/services/PaymentRequest';
import { MonadClient } from '../src/services/MonadClient';
import { PaymentLinkService } from '../src/services/PaymentLinkService';

describe('PaymentRequest', () => {
  let paymentRequest: PaymentRequest;
  let mockMonad: jest.Mocked<MonadClient>;
  let mockLinkService: jest.Mocked<PaymentLinkService>;

  beforeEach(() => {
    mockMonad = {
      generateRequestId: jest.fn(),
      createRequest: jest.fn(),
      getRequest: jest.fn(),
    } as any;

    mockLinkService = {
      generateLink: jest.fn(),
    } as any;

    paymentRequest = new PaymentRequest(mockMonad, mockLinkService);
  });

  it('should create a payment request with expiry', async () => {
    const mockRequestId = 'req_123';
    const mockLink = 'https://pay.example/request/123';
    mockMonad.generateRequestId.mockReturnValue(mockRequestId);
    mockMonad.createRequest.mockResolvedValue(undefined);
    mockLinkService.generateLink.mockResolvedValue(mockLink);

    const link = await paymentRequest.create(
      '0xFreelancer',
      500,
      'Project Delivery',
      30
    );

    expect(link).toBe(mockLink);
    expect(mockMonad.createRequest).toHaveBeenCalledWith({
      id: mockRequestId,
      from: '0xFreelancer',
      amount: 500,
      description: 'Project Delivery',
      expiry: expect.any(Date),
      status: 'PENDING',
    });
  });

  it('should validate a pending request', async () => {
    const mockRequest = {
      expiry: new Date(Date.now() + 3600000),
      status: 'PENDING',
    };
    mockMonad.getRequest.mockResolvedValue(mockRequest);

    const isValid = await paymentRequest.validate('req_123');
    expect(isValid).toBe(true);
  });
});

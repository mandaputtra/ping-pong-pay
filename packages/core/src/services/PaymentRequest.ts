import { MonadClient } from './MonadClient';
import { PaymentLinkService } from './PaymentLinkService';

export class PaymentRequest {
  constructor(
    private monad: MonadClient,
    private linkService: PaymentLinkService
  ) {}

  async create(
    freelancerAddress: string,
    amount: number,
    description: string,
    expiryMinutes: number = 60
  ): Promise<string> {
    const requestId = this.monad.generateRequestId();
    const expiry = new Date(Date.now() + expiryMinutes * 60000);

    await this.monad.createRequest({
      id: requestId,
      from: freelancerAddress,
      amount,
      description,
      expiry,
      status: 'PENDING'
    });

    return this.linkService.generateLink(requestId);
  }

  async validate(requestId: string): Promise<boolean> {
    const request = await this.monad.getRequest(requestId);
    return request.expiry > Date.now() && request.status === 'PENDING';
  }
}

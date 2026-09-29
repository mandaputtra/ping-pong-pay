import { MonadClient } from './MonadClient';
import { AuthService } from './AuthService';
import { PaymentRequest } from './PaymentRequest';

export class PaymentHandler {
  constructor(
    private monad: MonadClient,
    private auth: AuthService,
    private requestService: PaymentRequest
  ) {}

  async processPayment(
    requestId: string,
    clientAddress: string,
    biometricProof: string
  ): Promise<void> {
    await this.auth.verifyBiometric(biometricProof);
    const isValid = await this.requestService.validate(requestId);
    if (!isValid) throw new Error('Invalid or expired request');

    const request = await this.monad.getRequest(requestId);
    await this.monad.transferUSDC(
      clientAddress,
      request.from,
      request.amount
    );

    await this.monad.updateRequestStatus(requestId, 'COMPLETED');
  }
}

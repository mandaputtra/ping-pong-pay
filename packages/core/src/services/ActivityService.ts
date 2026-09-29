import { MonadClient } from './MonadClient';

export class ActivityService {
  constructor(private monad: MonadClient) {}

  async logPayment(
    requestId: string,
    from: string,
    to: string,
    amount: number
  ): Promise<void> {
    await this.monad.provider.logActivity({
      type: 'PAYMENT',
      requestId,
      from,
      to,
      amount,
      timestamp: new Date()
    });
  }

  async getActivity(walletAddress: string): Promise<any[]> {
    return this.monad.provider.getActivity(walletAddress);
  }
}

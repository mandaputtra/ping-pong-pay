import { MonadClient } from './MonadClient';

export class BalanceService {
  constructor(private monad: MonadClient) {}

  async getLiveBalance(walletAddress: string): Promise<number> {
    const usdcBalance = await this.monad.getUSDCBalance(walletAddress);
    return parseFloat(usdcBalance.toFixed(2));
  }

  async getActivity(walletAddress: string, limit: number = 10): Promise<any[]> {
    return this.monad.provider.getTransactionHistory(walletAddress, limit);
  }
}

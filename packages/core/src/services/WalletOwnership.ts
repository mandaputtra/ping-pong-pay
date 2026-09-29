import { MonadClient } from './MonadClient';

export class WalletOwnership {
  constructor(private monad: MonadClient) {}

  async register(walletAddress: string): Promise<void> {
    // Stores ownership proof on-chain
    await this.monad.provider.registerWalletOwnership(walletAddress);
  }

  async verify(walletAddress: string): Promise<boolean> {
    return this.monad.provider.verifyWalletOwnership(walletAddress);
  }
}

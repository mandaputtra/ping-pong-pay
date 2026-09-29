import { MonadClient } from './MonadClient';
import { AuthService } from './AuthService';
import { WalletOwnership } from './WalletOwnership';

export class WalletService {
  constructor(
    private monad: MonadClient,
    private auth: AuthService,
    private ownership: WalletOwnership
  ) {}

  async createWallet(biometricProof: string): Promise<string> {
    const walletAddress = await this.monad.generateWallet();
    await this.auth.verifyBiometric(biometricProof);
    await this.ownership.register(walletAddress);
    return walletAddress;
  }

  async getBalance(walletAddress: string): Promise<number> {
    return this.monad.getUSDCBalance(walletAddress);
  }

  async verifyOwnership(walletAddress: string): Promise<boolean> {
    return this.ownership.verify(walletAddress);
  }
}

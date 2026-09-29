import { ethers } from 'ethers';
import { MonadProvider } from '@monad-xyz/sdk';

export class MonadClient {
  private provider: MonadProvider;
  private usdcContract: string;

  constructor() {
    this.provider = new MonadProvider(process.env.MONAD_RPC_URL);
    this.usdcContract = process.env.MONAD_USDC_CONTRACT;
  }

  async generateWallet(): Promise<string> {
    const wallet = ethers.Wallet.createRandom();
    return wallet.address;
  }

  async getUSDCBalance(address: string): Promise<number> {
    const balance = await this.provider.getBalance(
      address,
      this.usdcContract
    );
    return ethers.formatUnits(balance, 6);
  }

  async createRequest(requestData: {
    id: string;
    from: string;
    amount: number;
    description: string;
    expiry: Date;
    status: string;
  }): Promise<void> {
    // Implementation uses Monad's request registry
    await this.provider.createRequest(requestData);
  }

  async getRequest(requestId: string): Promise<any> {
    return this.provider.getRequest(requestId);
  }

  async transferUSDC(
    from: string,
    to: string,
    amount: number
  ): Promise<void> {
    const tx = {
      from,
      to: this.usdcContract,
      data: this.provider.encodeTransfer(to, amount)
    };
    await this.provider.sendTransaction(tx);
  }

  async updateRequestStatus(
    requestId: string,
    status: string
  ): Promise<void> {
    await this.provider.updateRequestStatus(requestId, status);
  }
}

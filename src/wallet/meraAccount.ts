import { Account, createWalletClient, custom } from 'viem';
import { MONAD_TESTNET } from '@/config/monad';
import { Mera } from '@mera-passkey/web';

export class MeraAccount implements Account {
  private mera: Mera;
  private address: string;

  constructor() {
    this.mera = new Mera({ chainId: MONAD_TESTNET.id });
    this.address = this.mera.getAddress();
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    return this.mera.signMessage(message);
  }

  async signTypedData(domain: any, types: Record<string, any>, value: any): Promise<string> {
    return this.mera.signTypedData(domain, types, value);
  }

  getAddress(): string {
    return this.address;
  }

  async connect(): Promise<void> {
    await this.mera.connect();
  }

  static async createWalletClient() {
    const account = new MeraAccount();
    await account.connect();
    return createWalletClient({
      account,
      chain: MONAD_TESTNET,
      transport: custom(window.ethereum),
    });
  }
}
import { WalletService } from '../src/services/WalletService';
import { MonadClient } from '../src/services/MonadClient';
import { AuthService } from '../src/services/AuthService';
import { WalletOwnership } from '../src/services/WalletOwnership';

describe('WalletService', () => {
  let walletService: WalletService;
  let mockMonad: jest.Mocked<MonadClient>;
  let mockAuth: jest.Mocked<AuthService>;
  let mockOwnership: jest.Mocked<WalletOwnership>;

  beforeEach(() => {
    mockMonad = {
      generateWallet: jest.fn(),
      getUSDCBalance: jest.fn(),
    } as any;

    mockAuth = {
      verifyBiometric: jest.fn(),
    } as any;

    mockOwnership = {
      register: jest.fn(),
      verify: jest.fn(),
    } as any;

    walletService = new WalletService(mockMonad, mockAuth, mockOwnership);
  });

  it('should create a wallet with biometric auth', async () => {
    const mockAddress = '0xFreelancerWallet';
    mockMonad.generateWallet.mockResolvedValue(mockAddress);
    mockAuth.verifyBiometric.mockResolvedValue(true);

    const address = await walletService.createWallet('biometricProof');
    expect(address).toBe(mockAddress);
    expect(mockOwnership.register).toHaveBeenCalledWith(mockAddress);
  });

  it('should return wallet balance', async () => {
    mockMonad.getUSDCBalance.mockResolvedValue(500);
    const balance = await walletService.getBalance('0xWallet');
    expect(balance).toBe(500);
  });
});

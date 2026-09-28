import { Chain } from 'viem';

export const MONAD_TESTNET: Chain = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'AUSD', symbol: 'AUSD', decimals: 6 },
  rpcUrls: {
    default: { http: ['https://monad-testnet-rpc.quicknode.com'] },
    public: { http: ['https://testnet.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Scan', url: 'https://testnet.monad.xyz' },
  },
  contracts: {
    ausd: {
      address: '0x4200000000000000000000000000000000000006',
      abi: ["function balanceOf(address) view returns (uint256)"],
    },
  },
};

export const MONAD_MAINNET: Chain = {
  id: 143,
  name: 'Monad Mainnet',
  nativeCurrency: { name: 'AUSD', symbol: 'AUSD', decimals: 6 },
  rpcUrls: {
    default: { http: ['https://monad-mainnet-rpc.quicknode.com'] },
  },
  contracts: {
    ausd: {
      address: '0x4200000000000000000000000000000000000006',
    },
  },
};
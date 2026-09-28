import { useState, useEffect } from 'react';
import { MeraAccount } from '@/wallet/meraAccount';
import { PaymentRequest } from '@/components/PaymentRequest';
import { BalanceDisplay } from '@/components/BalanceDisplay';
import { PaymentLinkHandler } from '@/components/PaymentLinkHandler';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { MONAD_TESTNET } from '@/config/monad';

const { chains, publicClient } = configureChains(
  [MONAD_TESTNET],
  [publicProvider()]
);

const config = createConfig({
  autoConnect: true,
  publicClient,
});

function App() {
  const [account, setAccount] = useState<MeraAccount | null>(null);

  useEffect(() => {
    const init = async () => {
      const meraAccount = await MeraAccount.createWalletClient();
      setAccount(meraAccount.account);
    };
    init();
  }, []);

  return (
    <WagmiConfig config={config}>
      <div className="app">
        <h1>PingPongPay</h1>
        <BalanceDisplay />
        <PaymentRequest />
        <PaymentLinkHandler />
      </div>
    </WagmiConfig>
  );
}

export default App;
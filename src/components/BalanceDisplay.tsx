import { useState, useEffect } from 'react';
import { useContractRead } from 'wagmi';
import { MONAD_TESTNET } from '@/config/monad';

export function BalanceDisplay() {
  const { data: balance } = useContractRead({
    address: MONAD_TESTNET.contracts.ausd.address,
    abi: MONAD_TESTNET.contracts.ausd.abi,
    functionName: 'balanceOf',
    args: [window.mera.getAddress()],
  });

  const [displayBalance, setDisplayBalance] = useState<string>('0.00');

  useEffect(() => {
    if (balance) {
      setDisplayBalance((parseFloat(balance.toString()) / 1e6).toFixed(2));
    }
  }, [balance]);

  return (
    <div className="balance-display">
      <h2>Your Balance</h2>
      <p>${displayBalance}</p>
      <button onClick={() => window.open('https://faucet.monad.xyz', '_blank')}>
        Top Up AUSD (Testnet)
      </button>
    </div>
  );
}
import { Address, encodeAbiParameters, keccak256, toHex } from 'viem';
import { MONAD_TESTNET } from '@/config/monad';

export interface Invoice {
  to: Address;
  amount: bigint;
  nonce: number;
  expiry: Date;
}

export function generateInvoice(to: Address, amount: bigint, nonce: number, expiry: Date): string {
  const domain = {
    name: 'PingPongPay',
    version: '1',
    chainId: MONAD_TESTNET.id,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
  };

  const types = {
    Invoice: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
    ],
  };

  const value = {
    to,
    amount,
    nonce,
    expiry: Math.floor(expiry.getTime() / 1000),
  };

  const data = JSON.stringify({
    types,
    domain,
    primaryType: 'Invoice',
    message: value,
  });

  const hash = keccak256(new TextEncoder().encode(data));
  const signature = await (window as any).mera.signTypedData(domain, types, value);

  return `${window.location.origin}/pay?invoice=${encodeURIComponent(
    JSON.stringify(value)
  )}&signature=${signature}&domain=${encodeURIComponent(JSON.stringify(domain))}`;
}

export function verifyInvoice(invoice: Invoice, signature: string, domain: any): boolean {
  const data = JSON.stringify({
    types: { Invoice: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }] },
    domain,
    primaryType: 'Invoice',
    message: invoice,
  });

  const recoveredAddress = (window as any).mera.verifyTypedData(domain, { Invoice: invoice }, signature);
  return recoveredAddress === invoice.to;
}
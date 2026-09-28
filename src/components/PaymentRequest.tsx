import { useState } from 'react';
import { generateInvoice } from '@/payments/invoice';
import { useAccount, useSendTransaction } from 'wagmi';

export function PaymentRequest() {
  const [amount, setAmount] = useState<string>('10');
  const [note, setNote] = useState<string>('');
  const [expiry, setExpiry] = useState<number>(24);
  const { address } = useAccount();
  const { sendTransaction } = useSendTransaction();

  const handleCreateRequest = async () => {
    const invoice = await generateInvoice(
      address!,
      parseFloat(amount) * 1e6,
      Date.now(),
      new Date(Date.now() + expiry * 60 * 60 * 1000)
    );

    navigator.clipboard.writeText(invoice);
    alert('Payment request link copied to clipboard!');
  };

  return (
    <div className="payment-request">
      <h2>Create Payment Request</h2>
      <div>
        <label>Amount ($)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0.01"
          step="0.01"
        />
      </div>
      <div>
        <label>Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div>
        <label>Expiry (hours)</label>
        <input
          type="number"
          value={expiry}
          onChange={(e) => setExpiry(parseInt(e.target.value))}
          min="1"
        />
      </div>
      <button onClick={handleCreateRequest}>Generate Shareable Link</button>
    </div>
  );
}
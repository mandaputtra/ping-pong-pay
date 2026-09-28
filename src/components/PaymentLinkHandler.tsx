import { useEffect } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';
import { verifyInvoice } from '@/payments/invoice';

export function PaymentLinkHandler() {
  const { address } = useAccount();
  const { sendTransaction } = useSendTransaction();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const invoiceStr = urlParams.get('invoice');
    const signature = urlParams.get('signature');
    const domainStr = urlParams.get('domain');

    if (invoiceStr && signature && domainStr) {
      const invoice = JSON.parse(decodeURIComponent(invoiceStr));
      const domain = JSON.parse(decodeURIComponent(domainStr));

      if (!verifyInvoice(invoice, signature, domain)) {
        alert('Invalid payment request!');
        return;
      }

      if (invoice.expiry < Math.floor(Date.now() / 1000)) {
        alert('Payment request expired!');
        return;
      }

      const handlePay = async () => {
        const tx = await sendTransaction({
          to: invoice.to,
          value: invoice.amount,
        });
        alert(`Payment sent! Tx: ${tx.hash}`);
      };

      const payerAddress = await (window as any).mera.getAddress();
      if (payerAddress !== invoice.to) {
        const confirm = window.confirm(`Pay $${(invoice.amount / 1e6).toFixed(2)} to ${invoice.to}?`);
        if (confirm) handlePay();
      }
    }
  }, [address, sendTransaction]);

  return null;
}
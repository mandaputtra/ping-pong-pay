import { MonadClient } from './MonadClient';
import { QRCode } from 'qrcode';

export class PaymentLinkService {
  constructor(private monad: MonadClient) {}

  async generateLink(requestId: string): Promise<string> {
    const baseUrl = `${process.env.PAYMENT_GATEWAY_URL}/request/${requestId}`;
    const qrData = await QRCode.toDataURL(baseUrl);
    return {
      url: baseUrl,
      qr: qrData
    };
  }

  async resolveLink(link: string): Promise<string> {
    const requestId = link.split('/').pop();
    if (!requestId) throw new Error('Invalid payment link');
    return requestId;
  }
}

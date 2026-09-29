export interface PaymentRequest {
  id: string;
  from: string;
  amount: number;
  description: string;
  expiry: Date;
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
}

export interface PaymentLink {
  url: string;
  qr: string;
}

export interface PaymentActivity {
  type: 'PAYMENT' | 'WITHDRAWAL';
  requestId?: string;
  from: string;
  to: string;
  amount: number;
  timestamp: Date;
}

export interface Wallet {
  address: string;
  balance: number;
  ownershipProof: string;
}
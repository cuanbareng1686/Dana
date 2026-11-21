export type WalletProvider = 'dana' | 'gopay' | 'ovo';

export interface WalletAccount {
  id: string;
  provider: WalletProvider;
  name?: string;
  phoneNumber: string;
  pin: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletDraft {
  provider: WalletProvider;
  name: string;
  phoneNumber: string;
  pin: string;
}

export const WALLET_PROVIDERS: Record<
  WalletProvider,
  {
    id: WalletProvider;
    name: string;
    accentHex: string;
  }
> = {
  dana: {
    id: 'dana',
    name: 'DANA',
    accentHex: '#118EEA',
  },
  gopay: {
    id: 'gopay',
    name: 'GoPay',
    accentHex: '#00AED6',
  },
  ovo: {
    id: 'ovo',
    name: 'OVO',
    accentHex: '#4C3494',
  },
};

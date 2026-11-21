import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Smartphone, User } from 'lucide-react';
import {
  WALLET_PROVIDERS,
  WalletAccount,
  WalletProvider,
} from '../types/wallet';
import { ProviderMark } from './ProviderMark';
import { GoogleSignInButton } from './GoogleSignInButton';

interface WalletFormProps {
  editingAccount: WalletAccount | null;
  savedCount: number;
  isConnected: boolean;
  isSaving: boolean;
  isLoggingIn: boolean;
  onSubmit: (data: {
    provider: WalletProvider;
    name: string;
    phoneNumber: string;
    pin: string;
  }) => Promise<boolean>;
  onCancelEdit: () => void;
  onCheckSaved: () => void;
  onSignIn: () => void;
}

const PROVIDER_ORDER: WalletProvider[] = ['dana', 'gopay', 'ovo'];

export const WalletForm: React.FC<WalletFormProps> = ({
  editingAccount,
  savedCount,
  isConnected,
  isSaving,
  isLoggingIn,
  onSubmit,
  onCancelEdit,
  onCheckSaved,
  onSignIn,
}) => {
  const [provider, setProvider] = useState<WalletProvider>('dana');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingAccount) {
      setProvider(editingAccount.provider);
      setName(editingAccount.name || '');
      setPhoneNumber(editingAccount.phoneNumber);
      setPin(editingAccount.pin);
      setShowPin(false);
      setErrorMsg(null);
    } else {
      setName('');
      setPhoneNumber('');
      setPin('');
      setShowPin(false);
      setErrorMsg(null);
    }
  }, [editingAccount]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^\d+\-\s]/g, '');
    setPhoneNumber(cleaned);
    if (errorMsg) setErrorMsg(null);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 8);
    setPin(digitsOnly);
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const rawDigits = phoneNumber.replace(/\D/g, '');
    if (rawDigits.length < 8 || rawDigits.length > 15) {
      setErrorMsg('Nomor HP harus 8–15 digit');
      return;
    }

    if (pin.length < 4 || pin.length > 8) {
      setErrorMsg('PIN harus 4–8 digit');
      return;
    }

    setErrorMsg(null);
    const saved = await onSubmit({
      provider,
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      pin,
    });

    if (saved && !editingAccount) {
      setName('');
      setPhoneNumber('');
      setPin('');
      setShowPin(false);
    }
  };

  return (
    <div className="clay-inner-card rounded-[28px] p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4" noValidate>
        {/* Pilihan Dompet: DANA, GoPay, OVO */}
        <div
          className="grid grid-cols-3 gap-1.5 p-1.5 clay-input-field rounded-2xl"
          role="radiogroup"
          aria-label="Pilih dompet"
        >
          {PROVIDER_ORDER.map((id) => {
            const meta = WALLET_PROVIDERS[id];
            const isSelected = provider === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setProvider(id)}
                className={`min-h-[44px] px-1.5 sm:px-2 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8e69d3] ${
                  isSelected
                    ? 'bg-white text-[#46306e] shadow-xs'
                    : 'text-[#7b6b97] hover:text-[#46306e]'
                }`}
              >
                <ProviderMark provider={id} size="xs" />
                <span>{meta.name}</span>
              </button>
            );
          })}
        </div>

        {/* Input Nama */}
        <div className="relative flex items-center clay-input-field rounded-full h-[50px] sm:h-[52px] px-1.5">
          <div
            className="clay-icon-badge w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shrink-0"
            aria-hidden="true"
          >
            <User className="w-4 h-4" />
          </div>
          <input
            id="wallet-name"
            type="text"
            autoComplete="off"
            maxLength={40}
            aria-label="Nama"
            placeholder="Nama"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            className="w-full h-full bg-transparent pl-3 pr-4 text-[#3e2c5f] text-sm placeholder:text-[#8f7fa9] focus:outline-none"
          />
        </div>

        {/* Input Nomor HP */}
        <div className="relative flex items-center clay-input-field rounded-full h-[50px] sm:h-[52px] px-1.5">
          <div
            className="clay-icon-badge w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shrink-0"
            aria-hidden="true"
          >
            <Smartphone className="w-4 h-4" />
          </div>
          <input
            id="wallet-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            aria-label="Nomor HP"
            placeholder="Nomor HP"
            value={phoneNumber}
            onChange={handlePhoneChange}
            required
            className="w-full h-full bg-transparent pl-3 pr-4 text-[#3e2c5f] font-mono tabular-nums text-sm placeholder:font-sans placeholder:text-[#8f7fa9] focus:outline-none"
          />
        </div>

        {/* Input PIN */}
        <div className="relative flex items-center clay-input-field rounded-full h-[50px] sm:h-[52px] px-1.5">
          <div
            className="clay-icon-badge w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shrink-0"
            aria-hidden="true"
          >
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="wallet-pin"
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            autoComplete="new-password"
            aria-label="PIN"
            placeholder="PIN"
            maxLength={8}
            value={pin}
            onChange={handlePinChange}
            required
            className="w-full h-full bg-transparent pl-3 pr-11 text-[#3e2c5f] font-mono tabular-nums text-sm tracking-[0.18em] placeholder:font-sans placeholder:tracking-normal placeholder:text-[#8f7fa9] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPin((prev) => !prev)}
            aria-label={showPin ? 'Sembunyikan PIN' : 'Lihat PIN'}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-[#8a79a6] hover:text-[#4c3494] transition-colors shrink-0"
          >
            {showPin ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {errorMsg && (
          <p
            role="alert"
            className="text-xs font-medium text-red-600 text-center px-2"
          >
            {errorMsg}
          </p>
        )}

        {/* Primary Action Button */}
        <div className="pt-1 flex flex-col gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full min-h-[48px] clay-purple-btn rounded-full text-white text-sm font-bold tracking-wide transition-all inline-flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {isSaving
                ? 'Menyimpan...'
                : editingAccount
                  ? 'Simpan Perubahan'
                  : 'Simpan'}
            </span>
          </button>

          {editingAccount && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="w-full min-h-[40px] text-xs font-semibold text-[#7b6a98] hover:text-[#4c3494] transition-colors"
            >
              Batal Edit
            </button>
          )}
        </div>

        {/* Google Drive Connect (only shown when disconnected) */}
        {!isConnected && (
          <div className="pt-1.5 flex flex-col items-center gap-2.5">
            <div className="w-full flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e9dfd3]" />
              <span className="text-[11px] font-medium text-[#9586ae] whitespace-nowrap">
                Google Drive
              </span>
              <div className="h-px flex-1 bg-[#e9dfd3]" />
            </div>
            <GoogleSignInButton
              onClick={onSignIn}
              disabled={isLoggingIn}
              label={isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Google'}
            />
          </div>
        )}

        {/* Bottom Action Inside Input Card: Cek yang tersimpan */}
        <div className="pt-2 border-t border-[#efe6da] flex items-center justify-center">
          <button
            type="button"
            onClick={onCheckSaved}
            className="min-h-[44px] px-4 py-2 text-sm font-bold text-[#7c58c4] hover:text-[#5c3aa3] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Cek yang tersimpan</span>
            {isConnected && (
              <span className="font-mono tabular-nums text-xs text-[#9b88bd]">
                ({savedCount})
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

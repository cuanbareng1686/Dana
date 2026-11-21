import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { WALLET_PROVIDERS, WalletAccount } from '../types/wallet';

interface ConfirmDeleteModalProps {
  account: WalletAccount | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  account,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!account) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [account, onCancel]);

  if (!account) return null;

  const providerMeta = WALLET_PROVIDERS[account.provider];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2e1e54]/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm clay-inner-card border border-[#ece2d6] rounded-[28px] overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-[#efe6da]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-100 text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="confirm-delete-title"
                className="text-base font-bold text-[#3f2c63] truncate"
              >
                Hapus Akun?
              </h3>
              <p className="text-xs text-[#7c6a9c] mt-0.5 truncate">
                {providerMeta.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup dialog"
            className="min-h-[40px] min-w-[40px] -mr-2 -mt-2 flex items-center justify-center rounded-full text-[#8e7cad] hover:text-[#4c3494] hover:bg-[#f1eae0] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-4 space-y-3">
          <p className="text-sm text-[#5d4b7e] leading-relaxed">
            Akun {providerMeta.name} ini akan dihapus dari penyimpanan perangkat.
          </p>

          <div className="px-4 py-3 clay-input-field rounded-2xl text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#3f2c63]">
                {providerMeta.name}
              </span>
              {account.name && (
                <span className="text-xs font-medium text-[#6f5b91] truncate">
                  {account.name}
                </span>
              )}
            </div>
            <div className="mt-0.5 font-mono tabular-nums text-[#5b4782] break-all">
              {account.phoneNumber}
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 bg-[#f5ede3] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[42px] px-4 py-2 text-sm font-medium text-[#5c4a7c] bg-white border border-[#e3d8ca] rounded-full hover:bg-[#faf5ee] transition-colors whitespace-nowrap"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[42px] px-5 py-2 text-sm font-semibold text-white rounded-full transition-all whitespace-nowrap bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/25"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

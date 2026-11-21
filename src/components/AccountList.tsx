import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  WALLET_PROVIDERS,
  WalletAccount,
  WalletProvider,
} from '../types/wallet';
import { SyncedAccountRecord } from '../lib/drive';
import { ProviderMark } from './ProviderMark';
import { GoogleSignInButton } from './GoogleSignInButton';

interface AccountListProps {
  records: SyncedAccountRecord[];
  folderLink?: string;
  isConnected: boolean;
  isLoading: boolean;
  isSigningIn: boolean;
  onBack: () => void;
  onSignIn: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  onEdit: (record: SyncedAccountRecord) => void;
  onDelete: (record: SyncedAccountRecord) => void;
}

export const AccountList: React.FC<AccountListProps> = ({
  records,
  folderLink,
  isConnected,
  isLoading,
  isSigningIn,
  onBack,
  onSignIn,
  onLogout,
  onRefresh,
  onEdit,
  onDelete,
}) => {
  const [filter, setFilter] = useState<WalletProvider>('dana');
  const hasAutoSelectedRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedPinIds, setRevealedPinIds] = useState<Record<string, boolean>>(
    {}
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const counts = useMemo(() => {
    let dana = 0;
    let gopay = 0;
    let ovo = 0;
    for (const r of records) {
      if (r.account.provider === 'dana') dana++;
      else if (r.account.provider === 'gopay') gopay++;
      else if (r.account.provider === 'ovo') ovo++;
    }
    return {
      dana,
      gopay,
      ovo,
    };
  }, [records]);

  useEffect(() => {
    if (hasAutoSelectedRef.current || records.length === 0) return;
    hasAutoSelectedRef.current = true;
    if (counts.dana === 0) {
      if (counts.gopay > 0) setFilter('gopay');
      else if (counts.ovo > 0) setFilter('ovo');
    }
  }, [records.length, counts]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((rec) => {
      const acc = rec.account;
      if (acc.provider !== filter) return false;
      if (!q) return true;
      const providerName = WALLET_PROVIDERS[acc.provider].name.toLowerCase();
      return (
        (acc.name || '').toLowerCase().includes(q) ||
        acc.phoneNumber.toLowerCase().includes(q) ||
        providerName.includes(q)
      );
    });
  }, [records, filter, searchQuery]);

  const toggleRevealPin = (id: string) => {
    setRevealedPinIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedKey(null);
      }, 1500);
    } catch {
      // Clipboard blocked in restricted frames
    }
  };

  const filterButtons: { id: WalletProvider; label: string; count: number }[] = [
    { id: 'dana', label: 'DANA', count: counts.dana },
    { id: 'gopay', label: 'GoPay', count: counts.gopay },
    { id: 'ovo', label: 'OVO', count: counts.ovo },
  ];

  return (
    <div className="clay-inner-card rounded-[28px] p-4 sm:p-6 space-y-3.5 sm:space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[40px] px-3 py-1.5 rounded-full clay-input-field text-xs font-bold text-[#4d3774] hover:text-[#352059] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>

        {isConnected && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Sinkronkan ulang"
              className="min-h-[40px] min-w-[40px] rounded-full clay-input-field text-[#5e478a] hover:text-[#3a2561] flex items-center justify-center transition-colors disabled:opacity-60"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
            {folderLink && (
              <a
                href={folderLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Buka folder Google Drive"
                className="min-h-[40px] px-3 py-1.5 rounded-full clay-input-field text-xs font-semibold text-[#5e478a] hover:text-[#3a2561] inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Drive</span>
              </a>
            )}
            <button
              type="button"
              onClick={onLogout}
              aria-label="Keluar dari akun Google"
              className="min-h-[40px] min-w-[40px] rounded-full clay-input-field text-[#8f6a7d] hover:text-red-600 flex items-center justify-center transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Filter Segmented Control */}
      <div
        className="grid grid-cols-3 gap-1.5 p-1.5 clay-input-field rounded-2xl"
        role="tablist"
        aria-label="Filter dompet"
      >
        {filterButtons.map((btn) => {
          const active = filter === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(btn.id)}
              className={`min-h-[36px] px-2 py-1 text-xs font-bold rounded-xl transition-all whitespace-nowrap tabular-nums ${
                active
                  ? 'bg-white text-[#46306e] shadow-xs'
                  : 'text-[#7c6b98] hover:text-[#46306e]'
              }`}
            >
              {btn.label} ({btn.count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      {isConnected && records.length > 0 && (
        <div className="relative flex items-center clay-input-field rounded-full h-[44px] px-3.5">
          <Search className="w-4 h-4 text-[#8f7fa9] shrink-0" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau nomor..."
            aria-label="Cari nama atau nomor dompet"
            className="w-full h-full bg-transparent pl-2.5 text-sm text-[#3e2c5f] placeholder:text-[#8f7fa9] focus:outline-none"
          />
        </div>
      )}

      {/* Content */}
      <div className="max-h-[55vh] sm:max-h-[400px] overflow-y-auto pr-0.5 space-y-2.5">
        {!isConnected ? (
          <div className="py-8 text-center flex flex-col items-center gap-4">
            <p className="text-sm font-medium text-[#5e4b7e]">
              Masuk dengan Google untuk melihat akun yang tersimpan di Drive
            </p>
            <GoogleSignInButton
              onClick={onSignIn}
              disabled={isSigningIn}
              label={isSigningIn ? 'Menghubungkan...' : 'Masuk dengan Google'}
            />
          </div>
        ) : isLoading && records.length === 0 ? (
          <div className="space-y-2.5" aria-busy="true">
            {[1, 2, 3].map((row) => (
              <div
                key={row}
                className="h-[74px] rounded-2xl clay-input-field animate-pulse"
              />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#7b6a98]">
            Belum ada akun tersimpan di Google Drive.
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#7b6a98]">
            {searchQuery.trim()
              ? 'Tidak ditemukan nomor yang cocok.'
              : `Belum ada akun ${WALLET_PROVIDERS[filter].name} tersimpan.`}
          </div>
        ) : (
          filteredRecords.map((rec) => {
            const acc: WalletAccount = rec.account;
            const meta = WALLET_PROVIDERS[acc.provider];
            const isPinVisible = Boolean(revealedPinIds[acc.id]);
            const phoneCopyKey = `phone-${acc.id}`;
            const pinCopyKey = `pin-${acc.id}`;

            return (
              <div
                key={acc.id}
                className="p-3 sm:p-3.5 rounded-2xl bg-white border border-[#efe5d8] flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <ProviderMark provider={acc.provider} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-[#7c58c4] shrink-0">
                        {meta.name}
                      </span>
                      {acc.name && (
                        <>
                          <span className="text-xs text-[#b7a8d0]" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs font-semibold text-[#46306e] truncate">
                            {acc.name}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="font-mono tabular-nums text-sm font-semibold text-[#382659] truncate">
                        {acc.phoneNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(phoneCopyKey, acc.phoneNumber)
                        }
                        aria-label={`Salin nomor ${acc.phoneNumber}`}
                        className="min-h-[30px] min-w-[30px] inline-flex items-center justify-center rounded-full text-[#8f7fa9] hover:text-[#4c3494] hover:bg-[#f4ede4] transition-colors shrink-0"
                      >
                        {copiedKey === phoneCopyKey ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-[#6a588a]">
                      <span>PIN:</span>
                      <span className="font-mono tabular-nums font-medium text-[#3e2c5f] min-w-[52px]">
                        {isPinVisible ? acc.pin : '••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleRevealPin(acc.id)}
                        aria-label={
                          isPinVisible ? 'Sembunyikan PIN' : 'Lihat PIN'
                        }
                        className="min-h-[28px] min-w-[28px] inline-flex items-center justify-center rounded-full text-[#8f7fa9] hover:text-[#4c3494] hover:bg-[#f4ede4] transition-colors"
                      >
                        {isPinVisible ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(pinCopyKey, acc.pin)}
                        aria-label="Salin PIN"
                        className="min-h-[28px] min-w-[28px] inline-flex items-center justify-center rounded-full text-[#8f7fa9] hover:text-[#4c3494] hover:bg-[#f4ede4] transition-colors"
                      >
                        {copiedKey === pinCopyKey ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEdit(rec)}
                    aria-label={`Edit ${meta.name} ${acc.phoneNumber}`}
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full text-[#7c6a98] hover:text-[#4c3494] hover:bg-[#f4ede4] transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(rec)}
                    aria-label={`Hapus ${meta.name} ${acc.phoneNumber}`}
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full text-[#9c788a] hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

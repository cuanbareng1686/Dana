import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import {
  WALLET_PROVIDERS,
  WalletAccount,
  WalletDraft,
} from './types/wallet';
import {
  generateAccountId,
  loadLocalAccounts,
  mergeImportedAccounts,
  saveLocalAccounts,
  sortAccountsByUpdated,
} from './lib/storage';
import { WalletForm } from './components/WalletForm';
import { AccountList } from './components/AccountList';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { CsvModal } from './components/CsvModal';
import { PWAInstallButton } from './components/PWAInstallButton';

export default function App() {
  const [accounts, setAccounts] = useState<WalletAccount[]>(() =>
    loadLocalAccounts()
  );
  const [view, setView] = useState<'input' | 'saved'>('input');
  const [editingAccount, setEditingAccount] = useState<WalletAccount | null>(
    null
  );
  const [pendingDelete, setPendingDelete] = useState<WalletAccount | null>(
    null
  );
  const [csvModalMode, setCsvModalMode] = useState<'export' | 'import' | null>(
    null
  );

  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const duration = toast.type === 'error' ? 5000 : 3000;
    const timer = window.setTimeout(() => {
      setToast(null);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const persistAccounts = useCallback(
    (next: WalletAccount[]): boolean => {
      try {
        saveLocalAccounts(next);
        setAccounts(next);
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Gagal menyimpan data di perangkat.';
        showToast('error', message);
        return false;
      }
    },
    [showToast]
  );

  const handleFormSubmit = (draft: WalletDraft): boolean => {
    const now = new Date().toISOString();

    if (editingAccount) {
      const updated = sortAccountsByUpdated(
        accounts.map((acc) =>
          acc.id === editingAccount.id
            ? {
                ...acc,
                provider: draft.provider,
                name: draft.name || undefined,
                phoneNumber: draft.phoneNumber,
                pin: draft.pin,
                updatedAt: now,
              }
            : acc
        )
      );

      if (!persistAccounts(updated)) return false;
      setEditingAccount(null);
      setView('saved');
      showToast('success', 'Perubahan akun tersimpan');
      return true;
    }

    const newAccount: WalletAccount = {
      id: generateAccountId(),
      provider: draft.provider,
      name: draft.name || undefined,
      phoneNumber: draft.phoneNumber,
      pin: draft.pin,
      createdAt: now,
      updatedAt: now,
    };

    const next = sortAccountsByUpdated([newAccount, ...accounts]);
    if (!persistAccounts(next)) return false;
    showToast('success', `${WALLET_PROVIDERS[draft.provider].name} tersimpan`);
    return true;
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const next = accounts.filter((acc) => acc.id !== pendingDelete.id);
    if (!persistAccounts(next)) return;

    if (editingAccount?.id === pendingDelete.id) {
      setEditingAccount(null);
    }
    setPendingDelete(null);
    showToast('success', 'Akun dihapus');
  };

  const handleImportCsv = (drafts: WalletDraft[], skipped: number) => {
    const { merged, added, updated } = mergeImportedAccounts(accounts, drafts);
    if (!persistAccounts(merged)) return;

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} ditambah`);
    if (updated > 0) parts.push(`${updated} diperbarui`);
    if (skipped > 0) parts.push(`${skipped} dilewati`);

    showToast(
      'success',
      parts.length > 0 ? `Import selesai: ${parts.join(', ')}` : 'Import selesai'
    );
  };

  return (
    <div className="min-h-dvh w-full lavender-canvas flex items-center justify-center p-3.5 sm:p-6 relative overflow-x-hidden">
      {/* Subtle Decorative Clay Clouds */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="hidden md:block absolute top-[18%] left-[8%] w-24 h-10 rounded-full bg-white/80 shadow-md shadow-[#6f4ea8]/12" />
        <div className="hidden md:block absolute top-[15%] left-[10%] w-12 h-12 rounded-full bg-white/85" />
        <div className="hidden md:block absolute top-[34%] right-[9%] w-20 h-9 rounded-full bg-white/80 shadow-md shadow-[#6f4ea8]/12" />
        <div className="hidden md:block absolute top-[31%] right-[11%] w-10 h-10 rounded-full bg-white/85" />
      </div>

      {/* Centered Clay Card Container */}
      <main className="w-full max-w-[410px] relative z-10">
        {toast && (
          <div
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`mb-3 px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-start justify-between gap-2.5 shadow-sm leading-snug ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-[#fdf9f3] text-[#46306e] border border-[#e7dccf]'
            }`}
          >
            <div className="flex items-start gap-2 min-w-0">
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#8e69d3] mt-0.5" />
              )}
              <span className="break-words">{toast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Tutup notifikasi"
              className="shrink-0 p-0.5 rounded-full opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="clay-shell rounded-[32px] sm:rounded-[36px] p-3 sm:p-4">
          {view === 'input' ? (
            <WalletForm
              editingAccount={editingAccount}
              savedCount={accounts.length}
              onSubmit={handleFormSubmit}
              onCancelEdit={() => {
                setEditingAccount(null);
                setView('saved');
              }}
              onCheckSaved={() => setView('saved')}
            />
          ) : (
            <AccountList
              accounts={accounts}
              onBack={() => setView('input')}
              onExportCsv={() => setCsvModalMode('export')}
              onImportCsv={() => setCsvModalMode('import')}
              onEdit={(acc) => {
                setEditingAccount(acc);
                setView('input');
              }}
              onDelete={(acc) => setPendingDelete(acc)}
            />
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <PWAInstallButton />
        </div>
      </main>

      <ConfirmDeleteModal
        account={pendingDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <CsvModal
        mode={csvModalMode}
        accounts={accounts}
        onClose={() => setCsvModalMode(null)}
        onImport={handleImportCsv}
        onNotify={showToast}
      />
    </div>
  );
}

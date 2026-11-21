import React, { useCallback, useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  clearAccessToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './lib/auth';
import {
  createAccountFileInDrive,
  deleteDriveFile,
  DriveAuthExpiredError,
  ensureVaultFolder,
  syncAllFromDrive,
  SyncedAccountRecord,
  updateAccountFileInDrive,
  updateLegacyVaultFile,
} from './lib/drive';
import {
  DriveFileMeta,
  PendingDriveMutation,
  WALLET_PROVIDERS,
  WalletAccount,
  WalletProvider,
} from './types/wallet';
import { WalletForm } from './components/WalletForm';
import { AccountList } from './components/AccountList';
import { ConfirmDriveModal } from './components/ConfirmDriveModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

interface DraftInput {
  provider: WalletProvider;
  name: string;
  phoneNumber: string;
  pin: string;
}

function generateAccountId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `wlt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [view, setView] = useState<'input' | 'saved'>('input');
  const [records, setRecords] = useState<SyncedAccountRecord[]>([]);
  const [vaultFolder, setVaultFolder] = useState<DriveFileMeta | null>(null);
  const [legacyFile, setLegacyFile] = useState<DriveFileMeta | null>(null);

  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [isSavingDrive, setIsSavingDrive] = useState(false);

  const [editingRecord, setEditingRecord] =
    useState<SyncedAccountRecord | null>(null);
  const [pendingMutation, setPendingMutation] =
    useState<PendingDriveMutation | null>(null);

  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const lastSyncRef = useRef<number>(0);
  const syncInFlightRef = useRef<Promise<unknown> | null>(null);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleDriveError = useCallback(
    (err: unknown) => {
      if (err instanceof DriveAuthExpiredError) {
        clearAccessToken();
        setNeedsAuth(true);
        showToast('error', err.message);
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : 'Gagal terhubung ke Google Drive.';
      showToast('error', message);
    },
    [showToast]
  );

  const performAutoSync = useCallback(
    async (token: string, silent = false) => {
      if (syncInFlightRef.current) {
        return syncInFlightRef.current;
      }

      const run = (async () => {
        if (!silent) setIsLoadingDrive(true);
        try {
          const result = await syncAllFromDrive(token);
          setVaultFolder(result.folder);
          setRecords(result.records);
          setLegacyFile(result.legacyFile);
          lastSyncRef.current = Date.now();
          return result;
        } catch (err) {
          if (!silent) handleDriveError(err);
          return null;
        } finally {
          if (!silent) setIsLoadingDrive(false);
          syncInFlightRef.current = null;
        }
      })();

      syncInFlightRef.current = run;
      return run;
    },
    [handleDriveError]
  );

  useEffect(() => {
    const unsubscribe = initAuth(
      async (authedUser, token) => {
        setUser(authedUser);
        setNeedsAuth(false);
        await performAutoSync(token, false);
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, [performAutoSync]);

  // Automatic background sync when returning to the app window
  useEffect(() => {
    const onFocus = () => {
      const token = getAccessToken();
      if (!token || needsAuth) return;
      if (Date.now() - lastSyncRef.current > 15000) {
        void performAutoSync(token, true);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [needsAuth, performAutoSync]);

  const handleLogin = async (): Promise<string | null> => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setNeedsAuth(false);
      await performAutoSync(result.accessToken, false);
      return result.accessToken;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal masuk dengan Google. Silakan coba lagi.';
      showToast('error', msg);
      return null;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setRecords([]);
    setVaultFolder(null);
    setLegacyFile(null);
    setEditingRecord(null);
    setPendingMutation(null);
    setView('input');
  };

  const saveNewAccountToDrive = async (
    token: string,
    draft: DraftInput
  ): Promise<boolean> => {
    setIsSavingDrive(true);
    try {
      let folder = vaultFolder;
      if (!folder) {
        folder = await ensureVaultFolder(token);
        setVaultFolder(folder);
      }

      const now = new Date().toISOString();
      const newAccount: WalletAccount = {
        id: generateAccountId(),
        provider: draft.provider,
        name: draft.name || undefined,
        phoneNumber: draft.phoneNumber,
        pin: draft.pin,
        createdAt: now,
        updatedAt: now,
      };

      const createdRecord = await createAccountFileInDrive(
        token,
        newAccount,
        folder.id
      );

      setRecords((prev) => [createdRecord, ...prev]);
      lastSyncRef.current = Date.now();
      showToast(
        'success',
        `${WALLET_PROVIDERS[draft.provider].name} tersimpan ke Google Drive`
      );
      return true;
    } catch (err) {
      handleDriveError(err);
      return false;
    } finally {
      setIsSavingDrive(false);
    }
  };

  const handleFormSubmit = async (draft: DraftInput): Promise<boolean> => {
    let token = getAccessToken();

    if (!token || needsAuth) {
      token = await handleLogin();
      if (!token) return false;
    }

    if (editingRecord) {
      const now = new Date().toISOString();
      const updatedAccount: WalletAccount = {
        ...editingRecord.account,
        provider: draft.provider,
        name: draft.name || undefined,
        phoneNumber: draft.phoneNumber,
        pin: draft.pin,
        updatedAt: now,
      };

      setPendingMutation({
        type: 'edit',
        title: 'Perbarui di Google Drive?',
        description: `Perubahan akun ${WALLET_PROVIDERS[draft.provider].name} akan memperbarui file di Google Drive Anda.`,
        confirmLabel: 'Simpan',
        fileName: editingRecord.driveFileName,
        targetAccount: updatedAccount,
        driveFileId: editingRecord.driveFileId,
        isLegacyBulk: editingRecord.isLegacyBulk,
      });
      return false;
    }

    return saveNewAccountToDrive(token, draft);
  };

  const handleRequestDelete = (record: SyncedAccountRecord) => {
    const providerName = WALLET_PROVIDERS[record.account.provider].name;
    setPendingMutation({
      type: 'delete',
      title: 'Hapus dari Google Drive?',
      description: `Akun ${providerName} (${record.account.phoneNumber}) akan dihapus permanen dari Google Drive Anda.`,
      confirmLabel: 'Hapus',
      fileName: record.driveFileName,
      isDestructive: true,
      targetAccount: record.account,
      driveFileId: record.driveFileId,
      isLegacyBulk: record.isLegacyBulk,
    });
  };

  const handleConfirmMutation = async () => {
    if (!pendingMutation) return;
    const token = getAccessToken();
    if (!token) {
      setPendingMutation(null);
      setNeedsAuth(true);
      showToast('error', 'Sesi berakhir. Silakan masuk Google kembali.');
      return;
    }

    setIsSavingDrive(true);
    try {
      let updatedFileName = pendingMutation.fileName;

      if (pendingMutation.isLegacyBulk && legacyFile) {
        const legacyAccounts = records
          .filter((r) => r.isLegacyBulk)
          .map((r) => r.account);

        const nextLegacyAccounts =
          pendingMutation.type === 'delete'
            ? legacyAccounts.filter(
                (a) => a.id !== pendingMutation.targetAccount.id
              )
            : legacyAccounts.map((a) =>
                a.id === pendingMutation.targetAccount.id
                  ? pendingMutation.targetAccount
                  : a
              );

        await updateLegacyVaultFile(token, legacyFile.id, nextLegacyAccounts);
      } else if (pendingMutation.type === 'edit') {
        const updatedMeta = await updateAccountFileInDrive(
          token,
          pendingMutation.driveFileId,
          pendingMutation.targetAccount
        );
        if (updatedMeta.name) updatedFileName = updatedMeta.name;
      } else if (pendingMutation.type === 'delete') {
        await deleteDriveFile(token, pendingMutation.driveFileId);
      }

      lastSyncRef.current = Date.now();

      if (pendingMutation.type === 'edit') {
        setRecords((prev) =>
          prev.map((rec) =>
            rec.account.id === pendingMutation.targetAccount.id
              ? {
                  ...rec,
                  account: pendingMutation.targetAccount,
                  driveFileName: updatedFileName,
                }
              : rec
          )
        );
        setEditingRecord(null);
        setView('saved');
        showToast('success', 'Perubahan tersimpan ke Google Drive');
      } else {
        setRecords((prev) =>
          prev.filter((rec) => rec.account.id !== pendingMutation.targetAccount.id)
        );
        if (editingRecord?.account.id === pendingMutation.targetAccount.id) {
          setEditingRecord(null);
        }
        showToast('success', 'Akun dihapus dari Google Drive');
      }

      setPendingMutation(null);
    } catch (err) {
      handleDriveError(err);
    } finally {
      setIsSavingDrive(false);
    }
  };

  const handleCheckSaved = () => {
    setView('saved');
    const token = getAccessToken();
    if (token && !needsAuth) {
      void performAutoSync(token, false);
    }
  };

  const isConnected = !needsAuth && Boolean(user);

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
            className={`mb-3 px-4 py-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-2 shadow-sm ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-[#fdf9f3] text-[#46306e] border border-[#e7dccf]'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#8e69d3]" />
            )}
            <span className="truncate">{toast.text}</span>
          </div>
        )}

        <div className="clay-shell rounded-[32px] sm:rounded-[36px] p-3 sm:p-4">
          {view === 'input' ? (
            <WalletForm
              editingAccount={editingRecord?.account ?? null}
              savedCount={records.length}
              isConnected={isConnected}
              isSaving={isSavingDrive || isLoggingIn}
              isLoggingIn={isLoggingIn}
              onSubmit={handleFormSubmit}
              onCancelEdit={() => {
                setEditingRecord(null);
                setView('saved');
              }}
              onCheckSaved={handleCheckSaved}
              onSignIn={() => {
                void handleLogin();
              }}
            />
          ) : (
            <AccountList
              records={records}
              folderLink={vaultFolder?.webViewLink}
              isConnected={isConnected}
              isLoading={isLoadingDrive}
              isSigningIn={isLoggingIn}
              onBack={() => setView('input')}
              onSignIn={() => {
                void handleLogin();
              }}
              onLogout={handleLogout}
              onRefresh={() => {
                const token = getAccessToken();
                if (token) void performAutoSync(token, false);
              }}
              onEdit={(rec) => {
                setEditingRecord(rec);
                setView('input');
              }}
              onDelete={handleRequestDelete}
            />
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <PWAInstallButton />
        </div>
      </main>

      <OfflineIndicator />

      <ConfirmDriveModal
        mutation={pendingMutation}
        isSubmitting={isSavingDrive}
        onConfirm={handleConfirmMutation}
        onCancel={() => !isSavingDrive && setPendingMutation(null)}
      />
    </div>
  );
}

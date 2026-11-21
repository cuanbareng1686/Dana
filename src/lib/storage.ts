import { WalletAccount, WalletDraft } from '../types/wallet';

const STORAGE_KEY = 'dompetvault_accounts_v1';

export function generateAccountId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `wlt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isValidWalletAccount(value: unknown): value is WalletAccount {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    (item.provider === 'dana' ||
      item.provider === 'gopay' ||
      item.provider === 'ovo') &&
    typeof item.phoneNumber === 'string' &&
    typeof item.pin === 'string'
  );
}

export function sortAccountsByUpdated(accounts: WalletAccount[]): WalletAccount[] {
  return [...accounts].sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime()
  );
}

export function loadLocalAccounts(): WalletAccount[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(isValidWalletAccount);
    return sortAccountsByUpdated(valid);
  } catch {
    return [];
  }
}

export function saveLocalAccounts(accounts: WalletAccount[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    throw new Error('Gagal menyimpan data ke penyimpanan perangkat.');
  }
}

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function mergeImportedAccounts(
  existing: WalletAccount[],
  incoming: WalletDraft[]
): {
  merged: WalletAccount[];
  added: number;
  updated: number;
} {
  const next = [...existing];
  let added = 0;
  let updated = 0;

  for (const item of incoming) {
    const cleanPhone = item.phoneNumber.trim();
    const digits = normalizePhoneDigits(cleanPhone);
    const cleanName = item.name.trim() || undefined;
    const now = new Date().toISOString();

    const matchIdx = next.findIndex(
      (acc) =>
        acc.provider === item.provider &&
        normalizePhoneDigits(acc.phoneNumber) === digits
    );

    if (matchIdx >= 0) {
      const prev = next[matchIdx];
      next[matchIdx] = {
        ...prev,
        name: cleanName ?? prev.name,
        phoneNumber: cleanPhone,
        pin: item.pin,
        updatedAt: now,
      };
      updated++;
    } else {
      next.unshift({
        id: generateAccountId(),
        provider: item.provider,
        name: cleanName,
        phoneNumber: cleanPhone,
        pin: item.pin,
        createdAt: now,
        updatedAt: now,
      });
      added++;
    }
  }

  return {
    merged: sortAccountsByUpdated(next),
    added,
    updated,
  };
}

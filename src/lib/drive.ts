import {
  DriveFileMeta,
  VaultPayload,
  WALLET_PROVIDERS,
  WalletAccount,
} from '../types/wallet';

export const VAULT_FOLDER_NAME = 'DompetVault';
export const LEGACY_VAULT_FILE_NAME = 'dompet-vault.json';

export class DriveAuthExpiredError extends Error {
  constructor(message = 'Sesi Google Drive berakhir. Silakan masuk ulang.') {
    super(message);
    this.name = 'DriveAuthExpiredError';
  }
}

async function handleDriveResponse(res: Response): Promise<Response> {
  if (res.status === 401 || res.status === 403) {
    throw new DriveAuthExpiredError(
      'Izin akses Google Drive kedaluwarsa. Silakan masuk ulang.'
    );
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Gagal terhubung ke Google Drive (${res.status}).${
        errText ? ` ${errText.slice(0, 120)}` : ''
      }`
    );
  }
  return res;
}

export async function ensureVaultFolder(
  accessToken: string
): Promise<DriveFileMeta> {
  const query = encodeURIComponent(
    `mimeType = 'application/vnd.google-apps.folder' and appProperties has { key='dompetvaultFolder' and value='true' } and trashed = false`
  );
  const fields = encodeURIComponent('files(id, name, modifiedTime, webViewLink)');
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=${fields}&orderBy=createdTime asc`;

  const searchRes = await handleDriveResponse(
    await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  );
  const searchData = (await searchRes.json()) as { files?: DriveFileMeta[] };
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0];
  }

  const createRes = await handleDriveResponse(
    await fetch(
      'https://www.googleapis.com/drive/v3/files?fields=id,name,modifiedTime,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          name: VAULT_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
          appProperties: {
            dompetvaultFolder: 'true',
          },
        }),
      }
    )
  );
  return (await createRes.json()) as DriveFileMeta;
}

export interface SyncedAccountRecord {
  account: WalletAccount;
  driveFileId: string;
  driveFileName: string;
  webViewLink?: string;
  isLegacyBulk?: boolean;
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

async function readJsonFile<T>(
  accessToken: string,
  fileId: string
): Promise<T | null> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId
  )}?alt=media`;

  const res = await handleDriveResponse(
    await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  );

  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function syncAllFromDrive(accessToken: string): Promise<{
  folder: DriveFileMeta;
  records: SyncedAccountRecord[];
  legacyFile: DriveFileMeta | null;
}> {
  const folder = await ensureVaultFolder(accessToken);

  const entryQuery = encodeURIComponent(
    `appProperties has { key='dompetvaultEntry' and value='true' } and trashed = false`
  );
  const fields = encodeURIComponent('files(id, name, modifiedTime, webViewLink)');
  const entryUrl = `https://www.googleapis.com/drive/v3/files?q=${entryQuery}&spaces=drive&fields=${fields}&orderBy=modifiedTime desc&pageSize=100`;

  const entryRes = await handleDriveResponse(
    await fetch(entryUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  );
  const entryData = (await entryRes.json()) as { files?: DriveFileMeta[] };
  const entryFiles = entryData.files || [];

  const records: SyncedAccountRecord[] = [];

  const loadedEntries = await Promise.all(
    entryFiles.map(async (f) => {
      try {
        const parsed = await readJsonFile<WalletAccount>(accessToken, f.id);
        if (isValidWalletAccount(parsed)) {
          return {
            account: parsed,
            driveFileId: f.id,
            driveFileName: f.name,
            webViewLink: f.webViewLink,
            isLegacyBulk: false,
          } satisfies SyncedAccountRecord;
        }
        return null;
      } catch (err) {
        if (err instanceof DriveAuthExpiredError) throw err;
        return null;
      }
    })
  );

  for (const item of loadedEntries) {
    if (item) records.push(item);
  }

  let legacyFile: DriveFileMeta | null = null;
  const legacyQuery = encodeURIComponent(
    `name = '${LEGACY_VAULT_FILE_NAME}' and trashed = false`
  );
  const legacyRes = await handleDriveResponse(
    await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${legacyQuery}&spaces=drive&fields=${fields}&orderBy=modifiedTime desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )
  );
  const legacyData = (await legacyRes.json()) as { files?: DriveFileMeta[] };
  if (legacyData.files && legacyData.files.length > 0) {
    legacyFile = legacyData.files[0];
    const parsedLegacy = await readJsonFile<Partial<VaultPayload>>(
      accessToken,
      legacyFile.id
    );
    if (parsedLegacy && Array.isArray(parsedLegacy.accounts)) {
      for (const acc of parsedLegacy.accounts) {
        if (
          isValidWalletAccount(acc) &&
          !records.some((r) => r.account.id === acc.id)
        ) {
          records.push({
            account: acc,
            driveFileId: legacyFile.id,
            driveFileName: legacyFile.name,
            webViewLink: legacyFile.webViewLink,
            isLegacyBulk: true,
          });
        }
      }
    }
  }

  records.sort(
    (a, b) =>
      new Date(b.account.updatedAt || b.account.createdAt).getTime() -
      new Date(a.account.updatedAt || a.account.createdAt).getTime()
  );

  return { folder, records, legacyFile };
}

function buildMultipartBody(
  metadata: Record<string, unknown>,
  payload: unknown
): { boundary: string; body: string } {
  const boundary = `dompetvault_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(payload, null, 2)}\r\n` +
    `--${boundary}--`;
  return { boundary, body };
}

export async function createAccountFileInDrive(
  accessToken: string,
  account: WalletAccount,
  folderId: string
): Promise<SyncedAccountRecord> {
  const providerLabel = WALLET_PROVIDERS[account.provider].name;
  const cleanName = account.name?.trim();
  const fileName = cleanName
    ? `${providerLabel} - ${cleanName} (${account.phoneNumber}).json`
    : `${providerLabel} - ${account.phoneNumber}.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: [folderId],
    appProperties: {
      dompetvaultEntry: 'true',
      provider: account.provider,
    },
  };

  const { boundary, body } = buildMultipartBody(metadata, account);
  const fields = encodeURIComponent('id, name, modifiedTime, webViewLink');
  const url = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${fields}`;

  const res = await handleDriveResponse(
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    })
  );

  const meta = (await res.json()) as DriveFileMeta;
  return {
    account,
    driveFileId: meta.id,
    driveFileName: meta.name,
    webViewLink: meta.webViewLink,
    isLegacyBulk: false,
  };
}

export async function updateAccountFileInDrive(
  accessToken: string,
  driveFileId: string,
  account: WalletAccount
): Promise<DriveFileMeta> {
  const providerLabel = WALLET_PROVIDERS[account.provider].name;
  const cleanName = account.name?.trim();
  const fileName = cleanName
    ? `${providerLabel} - ${cleanName} (${account.phoneNumber}).json`
    : `${providerLabel} - ${account.phoneNumber}.json`;

  const metadata = {
    name: fileName,
    appProperties: {
      dompetvaultEntry: 'true',
      provider: account.provider,
    },
  };

  const { boundary, body } = buildMultipartBody(metadata, account);
  const fields = encodeURIComponent('id, name, modifiedTime, webViewLink');
  const url = `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
    driveFileId
  )}?uploadType=multipart&fields=${fields}`;

  const res = await handleDriveResponse(
    await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    })
  );

  return (await res.json()) as DriveFileMeta;
}

export async function updateLegacyVaultFile(
  accessToken: string,
  fileId: string,
  accounts: WalletAccount[]
): Promise<DriveFileMeta> {
  const payload: VaultPayload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    accounts,
  };

  const fields = encodeURIComponent('id, name, modifiedTime, webViewLink');
  const url = `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
    fileId
  )}?uploadType=media&fields=${fields}`;

  const res = await handleDriveResponse(
    await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(payload, null, 2),
    })
  );

  return (await res.json()) as DriveFileMeta;
}

export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId
  )}`;

  await handleDriveResponse(
    await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  );
}

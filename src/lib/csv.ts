import {
  WALLET_PROVIDERS,
  WalletAccount,
  WalletDraft,
  WalletProvider,
} from '../types/wallet';

function escapeCsvCell(value: string): string {
  if (/[",\r\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function accountsToCsv(accounts: WalletAccount[]): string {
  const headers = ['provider', 'nama', 'nomor_hp', 'pin', 'dibuat', 'diperbarui'];
  const rows = accounts.map((acc) => [
    WALLET_PROVIDERS[acc.provider].name,
    acc.name || '',
    acc.phoneNumber,
    acc.pin,
    acc.createdAt || '',
    acc.updatedAt || '',
  ]);

  return [
    headers.join(','),
    ...rows.map((cols) => cols.map((cell) => escapeCsvCell(cell)).join(',')),
  ].join('\r\n');
}

export function getExportFilename(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `dompetvault-backup-${today}.csv`;
}

export function triggerCsvDownload(csvContent: string): void {
  const bomContent = `\uFEFF${csvContent}`;
  const blob = new Blob([bomContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getExportFilename();
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

function detectDelimiter(sample: string): ',' | ';' {
  const firstLine = sample.split(/\r?\n/)[0] || '';
  let commaCount = 0;
  let semiCount = 0;
  let inQuotes = false;

  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === ',') commaCount++;
      else if (ch === ';') semiCount++;
    }
  }

  return semiCount > commaCount ? ';' : ',';
}

function parseCsvRows(text: string, delimiter: ',' | ';'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function normalizeProvider(raw: string): WalletProvider | null {
  const clean = raw.trim().toLowerCase();
  if (clean === 'dana') return 'dana';
  if (clean === 'gopay' || clean === 'go-pay' || clean === 'go pay') return 'gopay';
  if (clean === 'ovo') return 'ovo';
  return null;
}

export function parseAccountsCsv(rawText: string): {
  accounts: WalletDraft[];
  skipped: number;
} {
  const cleaned = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    return { accounts: [], skipped: 0 };
  }

  const delimiter = detectDelimiter(cleaned);
  const rows = parseCsvRows(cleaned, delimiter);
  if (rows.length === 0) {
    return { accounts: [], skipped: 0 };
  }

  const firstRowNormalized = rows[0].map((c) => c.trim().toLowerCase());
  const hasHeader = firstRowNormalized.some((h) =>
    ['provider', 'dompet', 'wallet', 'nomor_hp', 'nomor', 'phone', 'pin'].includes(h)
  );

  let providerIdx = 0;
  let nameIdx = 1;
  let phoneIdx = 2;
  let pinIdx = 3;
  let startRow = 0;

  if (hasHeader) {
    startRow = 1;
    providerIdx = firstRowNormalized.findIndex((h) =>
      ['provider', 'dompet', 'wallet', 'layanan', 'e-wallet'].includes(h)
    );
    nameIdx = firstRowNormalized.findIndex((h) =>
      ['nama', 'name', 'akun', 'label', 'pemilik'].includes(h)
    );
    phoneIdx = firstRowNormalized.findIndex((h) =>
      ['nomor_hp', 'nomor', 'no_hp', 'no hp', 'phone', 'phonenumber', 'hp'].includes(h)
    );
    pinIdx = firstRowNormalized.findIndex((h) =>
      ['pin', 'kode_pin', 'passcode'].includes(h)
    );
  } else if (rows[0].length === 3) {
    // Support headerless 3-column CSV: provider,nomor_hp,pin
    providerIdx = 0;
    nameIdx = -1;
    phoneIdx = 1;
    pinIdx = 2;
  }

  const accounts: WalletDraft[] = [];
  let skipped = 0;

  for (let i = startRow; i < rows.length; i++) {
    const cols = rows[i];
    const providerRaw = providerIdx >= 0 ? cols[providerIdx] || '' : '';
    const nameRaw = nameIdx >= 0 ? cols[nameIdx] || '' : '';
    const phoneRaw = phoneIdx >= 0 ? cols[phoneIdx] || '' : '';
    const pinRaw = pinIdx >= 0 ? cols[pinIdx] || '' : '';

    const provider = normalizeProvider(providerRaw);
    const phoneNumber = phoneRaw.replace(/[^\d+\-\s]/g, '').trim();
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    const pin = pinRaw.replace(/\D/g, '').slice(0, 8);

    if (
      !provider ||
      phoneDigits.length < 8 ||
      phoneDigits.length > 15 ||
      pin.length < 4 ||
      pin.length > 8
    ) {
      skipped++;
      continue;
    }

    accounts.push({
      provider,
      name: nameRaw.trim().slice(0, 40),
      phoneNumber,
      pin,
    });
  }

  return { accounts, skipped };
}

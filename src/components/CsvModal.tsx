import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Share2,
  Upload,
  X,
} from 'lucide-react';
import { WalletAccount, WalletDraft } from '../types/wallet';
import {
  accountsToCsv,
  getExportFilename,
  parseAccountsCsv,
  triggerCsvDownload,
} from '../lib/csv';

interface CsvModalProps {
  mode: 'export' | 'import' | null;
  accounts: WalletAccount[];
  onClose: () => void;
  onImport: (drafts: WalletDraft[], skipped: number) => void;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export const CsvModal: React.FC<CsvModalProps> = ({
  mode,
  accounts,
  onClose,
  onImport,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedCsv, setCopiedCsv] = useState(false);

  const exportCsvContent = useMemo(
    () => (mode === 'export' ? accountsToCsv(accounts) : ''),
    [mode, accounts]
  );

  useEffect(() => {
    if (!mode) {
      setCsvText('');
      setImportError(null);
      setCopiedCsv(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, onClose]);

  if (!mode) return null;

  const canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleDownload = () => {
    try {
      triggerCsvDownload(exportCsvContent);
      onNotify('success', 'File CSV berhasil diunduh');
      onClose();
    } catch {
      onNotify('error', 'Gagal mengunduh file. Gunakan tombol Salin CSV.');
    }
  };

  const handleShare = async () => {
    try {
      const filename = getExportFilename();
      const file = new File([`\uFEFF${exportCsvContent}`], filename, {
        type: 'text/csv',
      });

      if (
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: 'Backup DompetVault CSV',
          files: [file],
        });
      } else {
        await navigator.share({
          title: 'Backup DompetVault CSV',
          text: exportCsvContent,
        });
      }
      onNotify('success', 'CSV siap dibagikan');
      onClose();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      onNotify('error', 'Gagal membagikan file. Gunakan Salin CSV.');
    }
  };

  const handleCopyCsv = async () => {
    try {
      await navigator.clipboard.writeText(exportCsvContent);
      setCopiedCsv(true);
      window.setTimeout(() => setCopiedCsv(false), 1800);
      onNotify('success', 'Teks CSV berhasil disalin');
    } catch {
      onNotify('error', 'Gagal menyalin teks CSV');
    }
  };

  const processCsvText = (raw: string) => {
    const { accounts: parsed, skipped } = parseAccountsCsv(raw);
    if (parsed.length === 0) {
      setImportError(
        'Tidak ada baris valid. Pastikan format CSV: provider,nama,nomor_hp,pin'
      );
      return;
    }
    setImportError(null);
    onImport(parsed, skipped);
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      processCsvText(text);
    } catch {
      setImportError('Gagal membaca file CSV yang dipilih.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2e1e54]/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm clay-inner-card border border-[#ece2d6] rounded-[28px] overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-[#efe6da]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 clay-icon-badge text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="csv-modal-title"
                className="text-base font-bold text-[#3f2c63] truncate"
              >
                {mode === 'export' ? 'Export CSV' : 'Import CSV'}
              </h3>
              <p className="text-xs text-[#7c6a9c] mt-0.5 truncate">
                {mode === 'export'
                  ? `${accounts.length} akun siap diekspor`
                  : 'Format: provider,nama,nomor_hp,pin'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="min-h-[40px] min-w-[40px] -mr-2 -mt-2 flex items-center justify-center rounded-full text-[#8e7cad] hover:text-[#4c3494] hover:bg-[#f1eae0] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === 'export' ? (
          <div className="px-5 sm:px-6 py-4 space-y-3">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full min-h-[46px] clay-purple-btn rounded-full text-white text-sm font-bold inline-flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File (.csv)</span>
              </button>

              {canShare && (
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="w-full min-h-[44px] rounded-full bg-white border border-[#e3d8ca] text-sm font-semibold text-[#4d3774] hover:bg-[#faf5ee] inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Bagikan / Simpan CSV</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleCopyCsv()}
                className="w-full min-h-[44px] rounded-full clay-input-field text-sm font-semibold text-[#4d3774] hover:text-[#352059] inline-flex items-center justify-center gap-2 transition-colors"
              >
                {copiedCsv ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Teks CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 sm:px-6 py-4 space-y-3.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/comma-separated-values,application/csv,text/plain"
              onChange={(e) => void handleFileChange(e)}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[46px] clay-purple-btn rounded-full text-white text-sm font-bold inline-flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Pilih File .csv</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e9dfd3]" />
              <span className="text-[11px] font-medium text-[#9586ae] whitespace-nowrap">
                atau tempel teks CSV
              </span>
              <div className="h-px flex-1 bg-[#e9dfd3]" />
            </div>

            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                if (importError) setImportError(null);
              }}
              placeholder={`provider,nama,nomor_hp,pin\nDANA,Utama,081234567890,123456`}
              aria-label="Tempel teks CSV"
              className="w-full rounded-2xl clay-input-field p-3 text-xs font-mono text-[#3e2c5f] placeholder:text-[#9c8db5] focus:outline-none focus:ring-2 focus:ring-[#8e69d3]/40 resize-none"
            />

            {importError && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {importError}
              </p>
            )}

            <button
              type="button"
              disabled={!csvText.trim()}
              onClick={() => processCsvText(csvText)}
              className="w-full min-h-[42px] rounded-full bg-white border border-[#e3d8ca] text-sm font-bold text-[#4d3774] hover:bg-[#faf5ee] disabled:opacity-50 transition-colors"
            >
              Impor Teks CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

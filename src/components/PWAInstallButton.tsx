import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="min-h-[40px] px-4 py-2 rounded-full bg-[#fdf9f3]/90 border border-[#e7dccf] text-xs font-bold text-[#5e3fa1] hover:bg-white shadow-sm inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install Aplikasi</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="min-h-[40px] px-4 py-2 rounded-full bg-[#fdf9f3]/90 border border-[#e7dccf] text-xs font-bold text-[#5e3fa1] hover:bg-white shadow-sm inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install di iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2e1e54]/45"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowIOSGuide(false);
            }}
          >
            <div className="w-full max-w-xs clay-inner-card border border-[#ece2d6] rounded-[28px] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#3f2c63]">
                  Pasang di iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Tutup"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-[#8e7cad] hover:bg-[#f1eae0]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#5d4b7e] leading-relaxed">
                1. Ketuk tombol <strong>Bagikan (Share)</strong> di Safari.
                <br />
                2. Pilih <strong>Tambahkan ke Layar Utama</strong>.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

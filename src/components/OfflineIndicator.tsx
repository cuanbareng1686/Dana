import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#3e2c5f] text-[#fdf9f3] text-xs font-semibold shadow-lg inline-flex items-center gap-2 whitespace-nowrap"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-300 shrink-0" />
      <span>Mode Offline — Sambungkan internet untuk sinkron Drive</span>
    </div>
  );
};

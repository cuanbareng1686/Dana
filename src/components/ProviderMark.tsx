import React from 'react';
import { WalletProvider } from '../types/wallet';

interface ProviderMarkProps {
  provider: WalletProvider;
  size?: 'xs' | 'sm' | 'md';
}

export const ProviderMark: React.FC<ProviderMarkProps> = ({
  provider,
  size = 'md',
}) => {
  const dim =
    size === 'xs'
      ? 'w-6 h-6 rounded-md'
      : size === 'sm'
        ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg'
        : 'w-10 h-10 rounded-xl';
  const iconDim = size === 'xs' ? 'w-3.5 h-3.5' : 'w-5 h-5';

  if (provider === 'dana') {
    return (
      <div
        className={`${dim} bg-[#118EEA] text-white flex items-center justify-center shrink-0 select-none`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className={iconDim} fill="none">
          <path
            d="M4.5 8.5C7.2 6.8 10.2 6.8 12.5 8.2C14.8 9.6 17.3 9.6 19.5 8.2V15.5C17.3 16.9 14.8 16.9 12.5 15.5C10.2 14.1 7.2 14.1 4.5 15.8V8.5Z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  if (provider === 'gopay') {
    return (
      <div
        className={`${dim} bg-[#00AED6] text-white flex items-center justify-center shrink-0 select-none`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className={iconDim} fill="none">
          <rect
            x="4"
            y="6"
            width="16"
            height="12"
            rx="3.5"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          <circle cx="15" cy="12" r="2" fill="currentColor" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`${dim} bg-[#4C3494] text-white flex items-center justify-center shrink-0 select-none`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className={iconDim} fill="none">
        <circle
          cx="12"
          cy="12"
          r="6.2"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    </div>
  );
};

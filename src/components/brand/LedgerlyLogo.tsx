import React from 'react';

export interface LedgerlyLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'badge';
  className?: string;
  iconClassName?: string;
  badgeClassName?: string;
}

/**
 * Ledgerly Brand Mark
 * Minimalist geometric "L" monogram embedded with an upward wealth trajectory arrow.
 * Simple, iconic, and timeless — designed with Apple & Google branding aesthetics.
 */
export const LedgerlyGlyph: React.FC<{ className?: string; size?: number | string }> = ({
  className = 'w-6 h-6',
  size,
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-hidden="true"
  >
    {/* Geometric "L" Backbone: Balance & Financial Security */}
    <path
      d="M7 5C7 3.89543 7.89543 3 9 3C10.1046 3 11 3.89543 11 5V21C11 22.1046 11.8954 23 13 23H25C26.1046 23 27 23.8954 27 25C27 26.1046 26.1046 27 25 27H12C9.23858 27 7 24.7614 7 22V5Z"
      fill="currentColor"
    />
    {/* Upward Wealth & Growth Arrow: Financial Trajectory */}
    <path
      d="M16 14L24 6M24 6H19M24 6V11"
      stroke="#38bdf8"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const LedgerlyLogo: React.FC<LedgerlyLogoProps> = ({
  size = 'md',
  variant = 'badge',
  className = '',
  iconClassName = '',
  badgeClassName = '',
}) => {
  // Dimensions mapping
  const sizeMap: Record<string, { badge: string; icon: string }> = {
    xs: { badge: 'w-7 h-7 rounded-lg', icon: 'w-4 h-4' },
    sm: { badge: 'w-8 h-8 rounded-xl', icon: 'w-4.5 h-4.5' },
    md: { badge: 'w-10 h-10 rounded-xl', icon: 'w-5.5 h-5.5' },
    lg: { badge: 'w-12 h-12 rounded-2xl', icon: 'w-6.5 h-6.5' },
    xl: { badge: 'w-14 h-14 rounded-2xl', icon: 'w-8 h-8' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  if (variant === 'icon') {
    return (
      <LedgerlyGlyph
        className={`${currentSize.icon} text-white ${iconClassName} ${className}`}
      />
    );
  }

  return (
    <div
      className={`${currentSize.badge} bg-gradient-to-tr from-violet-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-violet-500/30 ${badgeClassName} ${className}`}
    >
      <LedgerlyGlyph className={`${currentSize.icon} text-white ${iconClassName}`} />
    </div>
  );
};

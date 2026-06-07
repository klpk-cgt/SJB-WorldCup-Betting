import React, { useState } from 'react';
import { getFlagFallbackText, getFlagStyle, normalizeFlagCode, toFlagEmoji } from '../../utils/flags';

export default function FlagBadge({
  flagCode,
  size = 'md',
  className = '',
}: {
  flagCode?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const style = getFlagStyle(flagCode);
  const emoji = toFlagEmoji(flagCode);
  const fallbackText = getFlagFallbackText(flagCode);
  const normalized = normalizeFlagCode(flagCode);
  const imgSrc = normalized ? `/flags/${normalized.toLowerCase()}.png` : '';
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
  };
  const innerSize = {
    sm: 'h-5 w-5 text-[9px]',
    md: 'h-7 w-7 text-[10px]',
    lg: 'h-9 w-9 text-xs',
  };

  return (
    <div className={`flex items-center justify-center rounded-full border border-white/70 bg-white/90 shadow-sm ${sizeClasses[size]} ${className}`}>
      {imgSrc && !imgError ? (
        <img
          src={imgSrc}
          alt={fallbackText}
          className={`rounded-full object-cover ${innerSize[size]}`}
          onError={() => setImgError(true)}
        />
      ) : style ? (
        <div className={`relative overflow-hidden rounded-full ring-1 ring-slate-200 ${innerSize[size]}`} style={style}>
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_55%)]" />
        </div>
      ) : emoji ? (
        <span className={`inline-flex items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 ${innerSize[size]}`}>
          <span aria-hidden="true" className={size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : 'text-sm'}>
            {emoji}
          </span>
        </span>
      ) : (
        <span className={`inline-flex items-center justify-center rounded-full bg-slate-900/85 font-black text-white ${innerSize[size]}`}>
          {fallbackText}
        </span>
      )}
    </div>
  );
}

import React from 'react';

type SmartAvatarProps = {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
};

function buildInitials(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return '?';
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function buildHue(name: string) {
  return [...name].reduce((value, char) => (value * 31 + char.charCodeAt(0)) % 360, 29);
}

function isImageLike(src?: string | null) {
  return Boolean(src && /^(\/|https?:\/\/|data:)/.test(src));
}

export default function SmartAvatar({ name, src, size = 40, className = '' }: SmartAvatarProps) {
  const initials = buildInitials(name);
  const hue = buildHue(name);

  if (isImageLike(src)) {
    return (
      <img
        src={src || undefined}
        alt={name}
        className={`rounded-full object-cover ring-1 ring-slate-200 ${className}`}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      aria-label={name}
      className={`inline-flex items-center justify-center rounded-full font-black text-white ring-1 ring-white/40 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: src ? size * 0.48 : size * 0.34,
        background: `linear-gradient(135deg, hsl(${hue} 56% 42%), hsl(${(hue + 36) % 360} 62% 34%))`,
      }}
    >
      {src && !isImageLike(src) ? src : initials}
    </span>
  );
}

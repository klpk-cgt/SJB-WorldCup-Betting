import { useEffect, useState } from 'react';
import type { AchievementBadgeSummary } from '../../types';

interface BadgeDetailModalProps {
  badge: AchievementBadgeSummary | null;
  onClose: () => void;
  iconSrc?: string;
}

const RARITY_LABEL: Record<string, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

const RARITY_BORDER: Record<string, string> = {
  common: '#cbd5e1',
  rare: '#22d3ee',
  epic: '#a78bfa',
  legendary: '#fbbf24',
};

const RARITY_SHADOW: Record<string, string> = {
  common: '12px rgba(0,0,0,0.1)',
  rare: '12px rgba(34,211,238,0.35)',
  epic: '24px rgba(167,139,250,0.35)',
  legendary: '32px rgba(251,191,36,0.5)',
};

const RARITY_TAG_BG: Record<string, string> = {
  common: '#f1f5f9',
  rare: '#cffafe',
  epic: 'linear-gradient(135deg,#a78bfa,#8b5cf6)',
  legendary: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
};

const RARITY_TAG_COLOR: Record<string, string> = {
  common: '#64748b',
  rare: '#0e7490',
  epic: '#fff',
  legendary: '#fff',
};

const RARITY_PROGRESS: Record<string, string> = {
  common: '#94a3b8',
  rare: 'linear-gradient(90deg,#22d3ee,#06b6d4)',
  epic: 'linear-gradient(90deg,#a78bfa,#8b5cf6)',
  legendary: 'linear-gradient(90deg,#fbbf24,#f59e0b)',
};

const RARITY_ANIMATION: Record<string, string> = {
  epic: 'epic-glow 2.5s ease-in-out infinite',
  legendary: 'legendary-pulse 2.5s ease-in-out infinite',
};

export default function BadgeDetailModal({ badge, onClose, iconSrc }: BadgeDetailModalProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (badge) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [badge]);

  useEffect(() => {
    setImgFailed(false);
  }, [badge]);

  if (!badge) return null;

  const rarity = badge.rarity || 'common';
  const pct = badge.target > 0 ? Math.min(100, Math.round((badge.current / badge.target) * 100)) : 0;
  const border = RARITY_BORDER[rarity];
  const shadow = RARITY_SHADOW[rarity];
  const animation = RARITY_ANIMATION[rarity];

  return (
    <div
      className="profile-modal-overlay active"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="profile-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profile-modal-handle" />
        <button
          className="profile-modal-close"
          onClick={onClose}
          aria-label="关闭"
          type="button"
        >
          ✕
        </button>

        <div className="profile-modal-icon-wrap">
          <div
            className="profile-badge-icon-wrap"
            style={{
              width: 88,
              height: 88,
              border: `2px solid ${border}`,
              boxShadow: `0 0 ${shadow}`,
              animation: animation || undefined,
            }}
          >
            {iconSrc && !imgFailed ? (
              <img
                src={iconSrc}
                alt={badge.label}
                width={56}
                height={56}
                style={{ objectFit: 'contain' }}
                onError={() => setImgFailed(true)}
              />
            ) : (
              <span style={{ fontSize: 46 }}>{badge.icon}</span>
            )}
          </div>
        </div>

        <h3 className="text-center text-[19px] font-extrabold text-slate-900 mb-2.5">{badge.label}</h3>

        <div className="flex gap-1.5 justify-center flex-wrap mb-3.5">
          <span
            className="inline-block text-[11px] font-extrabold px-2.5 py-1 rounded-full"
            style={{ background: RARITY_TAG_BG[rarity], color: RARITY_TAG_COLOR[rarity] }}
          >
            {RARITY_LABEL[rarity]}
          </span>
        </div>

        <p className="text-center text-[13px] text-slate-600 leading-relaxed mb-[18px] px-2.5">
          {badge.description}
        </p>

        <div className="rounded-[14px] bg-slate-50 p-3.5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-extrabold text-slate-500">
              {badge.unlocked ? '已完成' : '获取进度'}
            </span>
            <span className="text-[11px] font-extrabold text-slate-500 tabular-nums">
              {badge.current} / {badge.target}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: RARITY_PROGRESS[rarity] }}
            />
          </div>
          <div className="text-center mt-3.5">
            {badge.unlocked ? (
              <p className="text-xs font-bold text-emerald-600">
                ✓ 已解锁{badge.unlockedAt ? ` · ${badge.unlockedAt.slice(0, 10)}` : ''}
              </p>
            ) : (
              <p className="text-xs font-bold text-slate-400">🔒 未解锁 — 继续努力！</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

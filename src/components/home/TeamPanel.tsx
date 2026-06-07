import React from 'react';
import { Medal, Shield, Target } from 'lucide-react';
import { FocusMatchTeam, normalizeFlagCode } from './focusMatch';

interface TeamPanelProps {
  team: FocusMatchTeam;
  align?: 'left' | 'right';
  label: string;
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-cyan-400/18 bg-white/7 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-black text-orange-300">{value}</div>
    </div>
  );
}

export default function TeamPanel({ team, align = 'left', label }: TeamPanelProps) {
  const stats = team.stats || {};
  const flagCode = normalizeFlagCode(team.flagCode);
  const flagStyle = flagStyles[flagCode];
  const textAlign = align === 'right' ? 'text-right items-end' : 'text-left items-start';

  return (
    <div className={`flex flex-col ${textAlign}`}>
      <div className={`flex w-full ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        <div className="relative flex h-20 w-20 items-center justify-center rounded-[26px] border border-cyan-300/30 bg-white/12 shadow-[0_16px_36px_rgba(8,47,73,0.35)] backdrop-blur">
          <div className="absolute inset-1 rounded-[22px] border border-white/10" />
          {flagStyle ? (
            <div className="relative h-11 w-11 overflow-hidden rounded-full ring-2 ring-white/60" style={flagStyle}>
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_55%)]" />
            </div>
          ) : flagCode ? (
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-800/70 text-sm font-black text-cyan-100 ring-2 ring-white/20">
              {flagCode}
            </span>
          ) : (
            <Shield className="h-9 w-9 text-cyan-200" />
          )}
        </div>
      </div>

      <span className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
        {label}
      </span>
      <h3 className="mt-1 text-[26px] font-black tracking-tight text-slate-50">{team.name}</h3>

      <div className="mt-4 grid w-full grid-cols-3 gap-2">
        <StatChip
          icon={<Target className="h-3 w-3 text-slate-300" />}
          label="进球"
          value={typeof stats.goals === 'number' ? `${stats.goals}` : '--'}
        />
        <StatChip
          icon={<BarIcon />}
          label="场均"
          value={typeof stats.avgGoals === 'number' ? stats.avgGoals.toFixed(2) : '--'}
        />
        <StatChip
          icon={<Medal className="h-3 w-3 text-slate-300" />}
          label="排名"
          value={typeof stats.worldRank === 'number' ? `${stats.worldRank}` : '--'}
        />
      </div>
    </div>
  );
}

function BarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 text-slate-300" fill="none" stroke="currentColor">
      <path d="M3 12V8" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 12V5" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 12V3" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const flagStyles: Record<string, React.CSSProperties> = {
  AR: {
    background: 'linear-gradient(180deg, #7dd3fc 0 33%, #f8fafc 33% 66%, #7dd3fc 66% 100%)',
  },
  BR: {
    background:
      'radial-gradient(circle at center, #1d4ed8 0 18%, transparent 18%), linear-gradient(135deg, transparent 34%, #facc15 34% 66%, transparent 66%), #16a34a',
  },
  DE: {
    background: 'linear-gradient(180deg, #111827 0 33%, #dc2626 33% 66%, #f59e0b 66% 100%)',
  },
  ES: {
    background: 'linear-gradient(180deg, #dc2626 0 25%, #facc15 25% 75%, #dc2626 75% 100%)',
  },
  FR: {
    background: 'linear-gradient(90deg, #1d4ed8 0 33%, #f8fafc 33% 66%, #ef4444 66% 100%)',
  },
  GB: {
    background:
      'linear-gradient(0deg, transparent 42%, #f8fafc 42% 58%, transparent 58%), linear-gradient(90deg, transparent 42%, #f8fafc 42% 58%, transparent 58%), linear-gradient(0deg, transparent 46%, #dc2626 46% 54%, transparent 54%), linear-gradient(90deg, transparent 46%, #dc2626 46% 54%, transparent 54%), #1d4ed8',
  },
  IT: {
    background: 'linear-gradient(90deg, #16a34a 0 33%, #f8fafc 33% 66%, #ef4444 66% 100%)',
  },
  JP: {
    background: 'radial-gradient(circle at center, #ef4444 0 24%, transparent 24%), #f8fafc',
  },
  KR: {
    background:
      'radial-gradient(circle at 50% 44%, #ef4444 0 18%, transparent 18%), radial-gradient(circle at 50% 56%, #2563eb 0 18%, transparent 18%), #f8fafc',
  },
  MX: {
    background: 'linear-gradient(90deg, #16a34a 0 33%, #f8fafc 33% 66%, #ef4444 66% 100%)',
  },
  NL: {
    background: 'linear-gradient(180deg, #ef4444 0 33%, #f8fafc 33% 66%, #2563eb 66% 100%)',
  },
  PT: {
    background: 'linear-gradient(90deg, #166534 0 40%, #dc2626 40% 100%)',
  },
  US: {
    background:
      'linear-gradient(180deg, #dc2626 0 14%, #f8fafc 14% 28%, #dc2626 28% 42%, #f8fafc 42% 56%, #dc2626 56% 70%, #f8fafc 70% 84%, #dc2626 84% 100%)',
  },
};

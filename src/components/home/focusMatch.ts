export { flagStyles, normalizeFlagCode, toFlagEmoji } from '../../utils/flags';

export type TeamStats = {
  goals?: number;
  avgGoals?: number;
  worldRank?: number;
};

export type FocusMatchOdds = {
  homeWin?: number;
  draw?: number;
  awayWin?: number;
};

export type FocusMatchStatus = 'upcoming' | 'live' | 'finished';

export type FocusMatchTeam = {
  name: string;
  flagCode?: string;
  primaryColor?: string;
  stats?: TeamStats;
};

export type FocusMatch = {
  id: string;
  stage: string;
  groupName?: string;
  startTimeBeijing: string;
  countdownText?: string;
  venue?: string;
  headlineTag?: string;
  hotLabel?: string;
  status?: FocusMatchStatus;
  scoreText?: string;
  homeTeam: FocusMatchTeam;
  awayTeam: FocusMatchTeam;
  odds?: FocusMatchOdds;
};

export const focusCardTheme = {
  bgDark: '#050B1F',
  bgPanel: '#071633',
  borderBlue: '#1D9BF0',
  cyan: '#22D3EE',
  blue: '#2563EB',
  orange: '#F59E0B',
  redOrange: '#F97316',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  muted: '#64748B',
};

export function formatIndexValue(value?: number) {
  return typeof value === 'number' ? value.toFixed(2) : '--';
}

export function splitCountdown(countdownText?: string) {
  const source = countdownText || '00:00:00';
  const [hours = '00', minutes = '00', seconds = '00'] = source.split(':');
  return [hours, minutes, seconds];
}

export const mockFocusMatch: FocusMatch = {
  id: 'demo-france-germany',
  stage: '小组赛',
  groupName: 'C组',
  startTimeBeijing: '06/06 03:00',
  countdownText: '06:42:18',
  venue: '纽约 / 新泽西',
  headlineTag: '2026 世界杯',
  hotLabel: '热门',
  status: 'upcoming',
  homeTeam: {
    name: '法国',
    flagCode: 'FR',
    stats: {
      goals: 12,
      avgGoals: 2.0,
      worldRank: 3,
    },
  },
  awayTeam: {
    name: '德国',
    flagCode: 'DE',
    stats: {
      goals: 11,
      avgGoals: 1.83,
      worldRank: 12,
    },
  },
  odds: {
    homeWin: 1.67,
    draw: 3.5,
    awayWin: 5.2,
  },
};

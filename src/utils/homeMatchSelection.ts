import { MatchStatus } from '../types';

export const HOME_MATCH_WINDOW_MS = 3 * 60 * 60 * 1000;

const LIVE_STATUSES = new Set<MatchStatus>([MatchStatus.LIVE, MatchStatus.HT]);
const FINISHED_STATUSES = new Set<MatchStatus>([
  MatchStatus.FT,
  MatchStatus.AET,
  MatchStatus.PEN,
]);

export type HomeMatchSelectionCategory =
  | 'live'
  | 'current_window'
  | 'upcoming'
  | 'finished'
  | 'other';

export interface HomeMatchLike {
  id: string;
  startTimeUtc: string;
  status: MatchStatus | string;
  isSettled?: boolean;
}

export function getKickoffTime(match: Pick<HomeMatchLike, 'startTimeUtc'>) {
  return new Date(match.startTimeUtc).getTime();
}

export function isFinishedHomeMatch(match: Pick<HomeMatchLike, 'status' | 'isSettled'>) {
  return Boolean(match.isSettled) || FINISHED_STATUSES.has(match.status as MatchStatus);
}

export function isLiveHomeMatch(match: Pick<HomeMatchLike, 'status'>) {
  return LIVE_STATUSES.has(match.status as MatchStatus);
}

export function getHomeMatchCategory(
  match: Pick<HomeMatchLike, 'startTimeUtc' | 'status' | 'isSettled'>,
  now = Date.now(),
): HomeMatchSelectionCategory {
  if (isLiveHomeMatch(match)) return 'live';
  if (isFinishedHomeMatch(match)) return 'finished';
  if (match.status === MatchStatus.CANCELLED) return 'other';

  const kickoff = getKickoffTime(match);
  if (kickoff <= now && now - kickoff <= HOME_MATCH_WINDOW_MS) {
    return 'current_window';
  }

  if (kickoff > now && match.status === MatchStatus.NS) {
    return 'upcoming';
  }

  return 'other';
}

function categoryPriority(category: HomeMatchSelectionCategory) {
  switch (category) {
    case 'live':
      return 0;
    case 'current_window':
      return 1;
    case 'upcoming':
      return 2;
    case 'finished':
      return 3;
    default:
      return 4;
  }
}

export function rankHomeMatches<T extends HomeMatchLike>(matches: T[], now = Date.now()) {
  return [...matches].sort((left, right) => {
    const leftCategory = getHomeMatchCategory(left, now);
    const rightCategory = getHomeMatchCategory(right, now);
    const priorityDiff = categoryPriority(leftCategory) - categoryPriority(rightCategory);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const leftKickoff = getKickoffTime(left);
    const rightKickoff = getKickoffTime(right);

    if (leftCategory === 'live' || leftCategory === 'current_window' || leftCategory === 'finished') {
      return rightKickoff - leftKickoff;
    }

    return leftKickoff - rightKickoff;
  });
}

export function selectFeaturedHomeMatch<T extends HomeMatchLike>(matches: T[], now = Date.now()) {
  return rankHomeMatches(matches, now)[0];
}

export function selectNextUpcomingHomeMatch<T extends HomeMatchLike>(matches: T[], now = Date.now()) {
  return rankHomeMatches(matches, now).find((match) => getHomeMatchCategory(match, now) === 'upcoming') || null;
}

export function selectHomePredictionCandidates<T extends HomeMatchLike>(
  matches: T[],
  now = Date.now(),
  limit = 3,
) {
  const seen = new Set<string>();
  return rankHomeMatches(matches, now)
    .filter((match) => {
      const category = getHomeMatchCategory(match, now);
      if (category !== 'current_window' && category !== 'upcoming') {
        return false;
      }

      const kickoff = getKickoffTime(match);
      return category === 'current_window' || kickoff - now <= 3 * 24 * 60 * 60 * 1000;
    })
    .filter((match) => {
      if (seen.has(match.id)) return false;
      seen.add(match.id);
      return true;
    })
    .slice(0, limit);
}

import { Match, MatchStatus } from '../types';

const beijingDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const beijingLabelFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

export function getBeijingDayKey(isoString: string) {
  return beijingDayFormatter.format(new Date(isoString));
}

export function getBeijingDayLabel(isoString: string) {
  return beijingLabelFormatter.format(new Date(isoString));
}

export function sortMatchesByKickoff(matches: Match[]) {
  return [...matches].sort((a, b) => new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime());
}

export function getRelevantUpcomingMatches(matches: Match[]) {
  return sortMatchesByKickoff(
    matches.filter((match) =>
      [MatchStatus.NS, MatchStatus.LIVE, MatchStatus.HT].includes(match.status),
    ),
  );
}

export function getNearestMatchDayKey(matches: Match[]) {
  const firstMatch = getRelevantUpcomingMatches(matches)[0];
  return firstMatch ? getBeijingDayKey(firstMatch.startTimeUtc) : null;
}

export function getMatchesForNearestDay(matches: Match[]) {
  const nearestDay = getNearestMatchDayKey(matches);
  if (!nearestDay) return [];
  return getRelevantUpcomingMatches(matches).filter((match) => getBeijingDayKey(match.startTimeUtc) === nearestDay);
}

export function getMatchesForNearestDays(matches: Match[], dayCount = 2) {
  const upcoming = getRelevantUpcomingMatches(matches);
  const visibleDays: string[] = [];

  for (const match of upcoming) {
    const dayKey = getBeijingDayKey(match.startTimeUtc);
    if (!visibleDays.includes(dayKey)) {
      visibleDays.push(dayKey);
    }
    if (visibleDays.length >= dayCount) {
      break;
    }
  }

  return upcoming.filter((match) => visibleDays.includes(getBeijingDayKey(match.startTimeUtc)));
}

export function groupMatchesByDay(matches: Match[]) {
  return sortMatchesByKickoff(matches).reduce<Array<{ dayKey: string; label: string; matches: Match[] }>>((groups, match) => {
    const dayKey = getBeijingDayKey(match.startTimeUtc);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.dayKey === dayKey) {
      lastGroup.matches.push(match);
      return groups;
    }

    groups.push({
      dayKey,
      label: getBeijingDayLabel(match.startTimeUtc),
      matches: [match],
    });
    return groups;
  }, []);
}

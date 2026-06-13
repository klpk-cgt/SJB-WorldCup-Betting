import { MatchStatus } from '../../types';
import { isMatchOnBeijingDate, sortMatchesByStartTime, toBeijingDateKey } from '../helpers';
import { selectHomePredictionCandidates } from '../../utils/homeMatchSelection';

export interface DataJsonMatch {
  id: number;
  home?: string;
  away?: string;
  date?: string;
  time?: string;
  spf?: string;
  tip?: string;
  level?: string;
  score?: string;
  totalGoals?: string;
  htft?: string;
  code?: string;
  result?: string;
  ht_result?: string;
  injury?: string;
  venue?: string;
  focus?: boolean;
  tags?: string[];
  round?: number;
  group?: string;
}

export interface ThirdPartyPrediction {
  id: string | number;
  level?: string;
  tip?: string;
  score?: string;
  totalGoals?: string;
  spf?: string;
  note?: string;
}

export interface AIPredictionTeam {
  id?: string;
  name?: string;
  nameZh?: string;
  code?: string;
}

export interface AIPredictionOdds {
  h2h: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
}

export interface AIPredictionMatchInput {
  id: string;
  startTimeUtc: string;
  status: MatchStatus | string;
  homeTeam?: AIPredictionTeam;
  awayTeam?: AIPredictionTeam;
  odds?: AIPredictionOdds | null;
}

export interface AIPredictionMatch {
  matchId: string;
  home: string;
  away: string;
  matchTime: string;
  predictResult: string;
  predictScore: string;
  confidence: string;
  confidenceLevel: string;
  confidenceColor: string;
  totalGoals?: string;
  odds?: string;
  injury?: string;
  venue?: string;
  isFocus?: boolean;
  tags?: string[];
  reason: string;
  source: 'data-json' | 'vercel-api' | 'local-odds';
  disclaimer: string;
}

export interface AIPredictionResponse {
  success: boolean;
  updatedAt: string;
  title: string;
  summary: string;
  matches: AIPredictionMatch[];
  state: 'ready' | 'fallback' | 'empty';
  dataSource: 'data-json' | 'vercel-api' | 'local-odds' | 'none';
}

type ConfidenceKey = 'very_high' | 'high' | 'lean' | 'cautious' | 'unknown';

const TITLE = '今日 AI 娱乐预测';
const DISCLAIMER = 'AI 娱乐预测仅供群内娱乐参考，不构成正式建议。';

const CONFIDENCE_META: Record<ConfidenceKey, { label: string; color: string; weight: number }> = {
  very_high: { label: '高信心', color: 'emerald', weight: 5 },
  high: { label: '较高信心', color: 'cyan', weight: 4 },
  lean: { label: '有倾向', color: 'amber', weight: 3 },
  cautious: { label: '谨慎看好', color: 'slate', weight: 2 },
  unknown: { label: '暂无明确倾向', color: 'slate', weight: 1 },
};

function normalizePredictionLevel(level?: string): ConfidenceKey {
  const raw = String(level || '').trim().toLowerCase();

  if (
    raw.includes('铁胆') ||
    raw.includes('高信') ||
    raw.includes('veryhigh') ||
    raw.includes('very_high') ||
    raw.includes('strong')
  ) {
    return 'very_high';
  }

  if (
    raw.includes('稳胆') ||
    raw.includes('较高') ||
    raw.includes('high') ||
    raw.includes('confident')
  ) {
    return 'high';
  }

  if (
    raw.includes('大概率') ||
    raw.includes('倾向') ||
    raw.includes('lean') ||
    raw.includes('edge')
  ) {
    return 'lean';
  }

  if (
    raw.includes('中等') ||
    raw.includes('谨慎') ||
    raw.includes('medium') ||
    raw.includes('careful')
  ) {
    return 'cautious';
  }

  return 'unknown';
}

function getConfidenceWeight(level?: string) {
  return CONFIDENCE_META[normalizePredictionLevel(level)].weight;
}

function formatTip(tip: string | undefined, homeTeam: string, awayTeam: string) {
  const normalized = String(tip || '').trim().toLowerCase();
  if (normalized === '胜' || normalized === 'home') return `看好 ${homeTeam}`;
  if (normalized === '平' || normalized === 'draw') return '看好双方打平';
  if (normalized === '负' || normalized === 'away') return `看好 ${awayTeam}`;
  return '暂无明确倾向';
}

function stripCountryCode(name: string): string {
  return name
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '')
    .replace(/\([^)]*\)/g, '')
    .trim();
}

function normalizeTeamName(name: string): string {
  return stripCountryCode(name)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
}

function teamNameMatch(scrapedName: string, localName: string): boolean {
  const source = normalizeTeamName(scrapedName);
  const target = normalizeTeamName(localName);
  if (!source || !target) return false;
  return source === target || source.includes(target) || target.includes(source);
}

function isUpcomingWithinThreeDays(match: Pick<AIPredictionMatchInput, 'startTimeUtc' | 'status'>) {
  const kickoff = new Date(match.startTimeUtc).getTime();
  const now = Date.now();
  const diff = kickoff - now;
  return match.status === MatchStatus.NS && diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
}

function dedupeMatches(matches: AIPredictionMatchInput[]) {
  const seen = new Set<string>();
  return matches.filter((match) => {
    if (seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  });
}

function summarizeMatch(match: AIPredictionMatch, prefix: string) {
  return `${prefix}${match.home} vs ${match.away}，${match.confidence}。`;
}

export function selectCandidateMatches(matches: AIPredictionMatchInput[]) {
  const ordered = sortMatchesByStartTime(matches);
  const primaryCandidates = selectHomePredictionCandidates(ordered);

  if (primaryCandidates.length > 0) {
    return dedupeMatches(primaryCandidates);
  }

  const todayKey = toBeijingDateKey();
  const todayMatches = ordered.filter(
    (match) => match.status === MatchStatus.NS && isMatchOnBeijingDate(match, todayKey),
  );
  const futureMatches = ordered.filter((match) => isUpcomingWithinThreeDays(match));
  return dedupeMatches([...todayMatches, ...futureMatches]);
}

function buildCardBase(
  match: AIPredictionMatchInput,
  options: {
    predictResult: string;
    predictScore?: string;
    confidenceKey?: ConfidenceKey;
    totalGoals?: string;
    odds?: string;
    injury?: string;
    venue?: string;
    isFocus?: boolean;
    tags?: string[];
    reason: string;
    source: 'data-json' | 'vercel-api' | 'local-odds';
  },
): AIPredictionMatch {
  const confidenceKey = options.confidenceKey || 'unknown';
  const confidence = CONFIDENCE_META[confidenceKey];

  return {
    matchId: match.id,
    home: match.homeTeam?.nameZh || match.homeTeam?.name || '主队',
    away: match.awayTeam?.nameZh || match.awayTeam?.name || '客队',
    matchTime: match.startTimeUtc,
    predictResult: options.predictResult,
    predictScore: options.predictScore || '待定',
    confidence: confidence.label,
    confidenceLevel: confidenceKey,
    confidenceColor: confidence.color,
    totalGoals: options.totalGoals,
    odds: options.odds,
    injury: options.injury,
    venue: options.venue,
    isFocus: options.isFocus,
    tags: options.tags,
    reason: options.reason,
    source: options.source,
    disclaimer: DISCLAIMER,
  };
}

export function buildDataJsonCards(
  matches: AIPredictionMatchInput[],
  dataMatches: DataJsonMatch[],
): AIPredictionMatch[] {
  const candidates = selectCandidateMatches(matches);

  // Match by id: data.json id (1-based) maps to match id "m-1", "m-2", etc.
  const matched = candidates
    .map((match) => {
      const numericId = parseInt(match.id.replace(/^m-/i, ''), 10);
      const prediction = dataMatches.find((item) => item.id === numericId);
      return prediction ? { match, prediction } : null;
    })
    .filter((item): item is { match: AIPredictionMatchInput; prediction: DataJsonMatch } => Boolean(item))
    .sort((a, b) => {
      // Focus matches first
      if (a.prediction.focus && !b.prediction.focus) return -1;
      if (!a.prediction.focus && b.prediction.focus) return 1;
      // Then by confidence weight
      const weightDiff = getConfidenceWeight(b.prediction.level) - getConfidenceWeight(a.prediction.level);
      if (weightDiff !== 0) return weightDiff;
      // Then by kickoff time
      return a.match.startTimeUtc.localeCompare(b.match.startTimeUtc);
    });

  return matched.slice(0, 1).map(({ match, prediction }) => {
    const home = match.homeTeam?.nameZh || match.homeTeam?.name || '主队';
    const away = match.awayTeam?.nameZh || match.awayTeam?.name || '客队';
    const confidenceKey = normalizePredictionLevel(prediction.level);
    const reasonParts = [
      formatTip(prediction.tip, home, away),
      prediction.score ? `参考比分 ${prediction.score}` : '',
      prediction.spf ? `竞彩赔率 ${prediction.spf}` : '',
      `信心等级 ${CONFIDENCE_META[confidenceKey].label}`,
      prediction.totalGoals ? `进球预期 ${prediction.totalGoals}` : '',
      prediction.injury ? `伤停 ${prediction.injury.slice(0, 80)}${prediction.injury.length > 80 ? '...' : ''}` : '',
    ].filter(Boolean);

    return buildCardBase(
      match,
      {
        predictResult: formatTip(prediction.tip, home, away),
        predictScore: prediction.score || prediction.result || '待定',
        confidenceKey,
        totalGoals: prediction.totalGoals || '待定',
        odds: prediction.spf || '待定',
        injury: prediction.injury,
        venue: prediction.venue,
        isFocus: prediction.focus || false,
        tags: prediction.tags && prediction.tags.length > 0 ? prediction.tags : undefined,
        reason: reasonParts.join('；'),
        source: 'data-json',
      },
    );
  });
}

function normalizeMatchId(value: string | number | undefined | null) {
  return String(value ?? '').trim().replace(/^m-/i, '');
}

export function buildThirdPartyCards(
  matches: AIPredictionMatchInput[],
  predictions: ThirdPartyPrediction[],
): AIPredictionMatch[] {
  return selectCandidateMatches(matches)
    .map((match) => {
      const localId = normalizeMatchId(match.id);
      const prediction =
        predictions.find((item) => normalizeMatchId(item.id) === localId) ||
        predictions.find((item) => normalizeMatchId(item.id) === localId.replace(/^0+/, ''));
      return prediction ? { match, prediction } : null;
    })
    .filter((item): item is { match: AIPredictionMatchInput; prediction: ThirdPartyPrediction } => Boolean(item))
    .sort((a, b) => {
      const weightDiff = getConfidenceWeight(b.prediction.level) - getConfidenceWeight(a.prediction.level);
      if (weightDiff !== 0) return weightDiff;
      return a.match.startTimeUtc.localeCompare(b.match.startTimeUtc);
    })
    .slice(0, 1)
    .map(({ match, prediction }) => {
      const confidenceKey = normalizePredictionLevel(prediction.level);
      const home = match.homeTeam?.nameZh || match.homeTeam?.name || '主队';
      const away = match.awayTeam?.nameZh || match.awayTeam?.name || '客队';
      const reasonParts = [
        formatTip(prediction.tip, home, away),
        prediction.score ? `参考比分 ${prediction.score}` : '比分仍在更新',
        `信心等级 ${CONFIDENCE_META[confidenceKey].label}`,
        prediction.note ? `补充说明 ${prediction.note}` : '',
      ].filter(Boolean);

      return buildCardBase(match, {
        predictResult: formatTip(prediction.tip, home, away),
        predictScore: prediction.score || '待定',
        confidenceKey,
        totalGoals: prediction.totalGoals || '待定',
        odds: prediction.spf || '待定',
        reason: reasonParts.join('；'),
        source: 'vercel-api',
      });
    });
}

function getLocalConfidenceKey(match: AIPredictionMatchInput): ConfidenceKey {
  const odds = match.odds?.h2h;
  if (!odds) return 'cautious';

  const sortedOdds = [odds.homeWin, odds.draw, odds.awayWin]
    .filter((value) => typeof value === 'number')
    .sort((a, b) => a - b);

  if (sortedOdds.length < 2) return 'cautious';

  const gap = sortedOdds[1] - sortedOdds[0];
  if (sortedOdds[0] <= 1.45 || gap >= 1.2) return 'very_high';
  if (sortedOdds[0] <= 1.75 || gap >= 0.7) return 'high';
  if (gap >= 0.35) return 'lean';
  return 'cautious';
}

export function buildLocalFallbackCards(matches: AIPredictionMatchInput[]): AIPredictionMatch[] {
  return selectCandidateMatches(matches)
    .slice(0, 1)
    .map((match) => {
      const odds = match.odds?.h2h;
      const home = match.homeTeam?.nameZh || match.homeTeam?.name || '主队';
      const away = match.awayTeam?.nameZh || match.awayTeam?.name || '客队';

      let predictResult = `关注 ${home} vs ${away}`;
      let predictScore = '1:1';
      let reason = '第三方预测暂不可用，当前先按赛程焦点战展示，建议临场再结合首发和赔率变化判断。';

      if (odds) {
        const entries = [
          { key: 'home', label: `看好 ${home}`, odds: odds.homeWin },
          { key: 'draw', label: '看好双方打平', odds: odds.draw },
          { key: 'away', label: `看好 ${away}`, odds: odds.awayWin },
        ].sort((a, b) => a.odds - b.odds);

        const favorite = entries[0];
        predictResult = favorite.label;
        predictScore = favorite.key === 'draw' ? '1:1' : favorite.odds <= 1.4 ? '2:0' : favorite.odds <= 1.8 ? '2:1' : '1:0';
        reason = `第三方预测暂不可用，已切换为本地赔率娱乐预测。当前更偏向 ${favorite.label}，主胜/平/客胜赔率为 ${odds.homeWin}/${odds.draw}/${odds.awayWin}。`;
      }

      return buildCardBase(match, {
        predictResult,
        predictScore,
        confidenceKey: getLocalConfidenceKey(match),
        totalGoals: '待定',
        odds: odds ? `${odds.homeWin}/${odds.draw}/${odds.awayWin}` : '待定',
        reason,
        source: 'local-odds',
      });
    });
}

export function buildAIPredictionCardPayload(params: {
  matches: AIPredictionMatchInput[];
  dataJsonMatches?: DataJsonMatch[];
  thirdPartyPredictions?: ThirdPartyPrediction[];
  updatedAt?: string;
}): AIPredictionResponse {
  const updatedAt = params.updatedAt || new Date().toISOString();
  const candidates = selectCandidateMatches(params.matches);
  const dataJsonCards = params.dataJsonMatches?.length
    ? buildDataJsonCards(candidates, params.dataJsonMatches)
    : [];

  if (dataJsonCards.length > 0) {
    const firstMatch = dataJsonCards[0];
    return {
      success: true,
      updatedAt,
      title: TITLE,
      summary: firstMatch.isFocus
        ? summarizeMatch(firstMatch, '焦点战 AI 预测：')
        : summarizeMatch(firstMatch, 'AI 娱乐预测：'),
      matches: dataJsonCards,
      state: 'ready',
      dataSource: 'data-json',
    };
  }

  const thirdPartyCards = params.thirdPartyPredictions?.length
    ? buildThirdPartyCards(candidates, params.thirdPartyPredictions)
    : [];

  if (thirdPartyCards.length > 0) {
    return {
      success: true,
      updatedAt,
      title: TITLE,
      summary: summarizeMatch(thirdPartyCards[0], '今日 AI 更看好 '),
      matches: thirdPartyCards,
      state: 'ready',
      dataSource: 'vercel-api',
    };
  }

  const localFallbackCards = buildLocalFallbackCards(candidates);
  if (localFallbackCards.length > 0) {
    return {
      success: true,
      updatedAt,
      title: TITLE,
      summary: '第三方预测暂不可用，已切换为本地赔率娱乐预测。',
      matches: localFallbackCards,
      state: 'fallback',
      dataSource: 'local-odds',
    };
  }

  return {
    success: true,
    updatedAt,
    title: TITLE,
    summary: '今天暂时没有可展示的未开赛比赛，赛程更新后会自动恢复。',
    matches: [],
    state: 'empty',
    dataSource: 'none',
  };
}

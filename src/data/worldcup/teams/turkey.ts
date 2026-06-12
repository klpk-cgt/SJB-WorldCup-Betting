import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const TURKEY_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'TUR',
    nameZh: '土耳其',
    nameEn: 'Turkey',
    confederation: 'UEFA',
    coachName: '文森佐·蒙特拉',
    coachNationality: '意大利',
    captainName: '哈坎·恰尔汗奥卢',
    fifaRank: 37,
    worldCupAppearances: 2,
    bestResult: '季军(2002)',
    titles: 0,
    squadValue: 320000000,
    squadValueDate: '2026-06-07',
    intro: '土耳其2次参加世界杯，2002年获得季军创造历史。哈坎·苏克11秒的闪电进球永载史册。恰尔汗奥卢领衔的新一代土耳其足球正在崛起。',
    tags: ['星月军团', '2002季军', '11秒进球', '恰尔汗奥卢'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'TUR',
    records: [
      { year: 2002, host: '韩日', result: '季军', finalRank: 3, wins: 4, draws: 0, losses: 2, goalsFor: 10, goalsAgainst: 6, matchesPlayed: 7, note: '3-2胜韩国获季军，哈坎·苏克11秒进球' },
      { year: 1954, host: '瑞士', result: '小组赛', finalRank: 10, wins: 1, draws: 0, losses: 1, goalsFor: 10, goalsAgainst: 11, matchesPlayed: 2, note: '7-0胜韩国，2-7负西德' },
    ],
    summary: '土耳其2次参加世界杯，2002年获得季军创造历史。哈坎·苏克对韩国11秒的进球是世界杯历史最快进球。时隔24年重返世界杯，土耳其渴望再续辉煌。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'TUR',
    confederation: 'UEFA',
    group: 'F组',
    rank: 2,
    matchesPlayed: 10,
    wins: 6,
    draws: 2,
    losses: 2,
    goalsFor: 19,
    goalsAgainst: 8,
    points: 20,
    qualificationMethod: '欧洲区预选赛F组第2名通过附加赛晋级',
    keyMatches: [
      { date: '2025-10-14', opponent: '荷兰', venue: 'home', score: '2-1', result: 'win', note: '主场力克荷兰' },
      { date: '2026-03-24', opponent: '波兰', venue: 'neutral', score: '3-1', result: 'win', note: '附加赛大胜波兰' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'tur-story-1',
      teamId: 'TUR',
      type: 'record',
      title: '11秒！世界杯历史最快进球',
      content: '2002年6月29日，大邱世界杯体育场。世界杯季军争夺战，土耳其对阵韩国。开场仅11秒，哈坎·苏克抢断洪明甫后推射破门，创造了世界杯历史最快进球纪录。这个纪录至今未被打破，成为世界杯历史上最不可思议的瞬间之一。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'tur-story-2',
      teamId: 'TUR',
      type: 'classic_match',
      title: '2002小组赛：1-0胜日本闯入四强',
      content: '2002年6月18日，宫城体育场。土耳其在1/8决赛1-0击败东道主日本。于米特·达瓦拉第12分钟头球破门，此后土耳其铁桶阵封锁了日本的反扑。这场胜利让土耳其闯入八强，最终一路杀入季军。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};

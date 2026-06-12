import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const AUSTRIA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'AUT',
    nameZh: '奥地利',
    nameEn: 'Austria',
    confederation: 'UEFA',
    coachName: '拉尔夫·朗尼克',
    coachNationality: '德国',
    captainName: '大卫·阿拉巴',
    fifaRank: 22,
    worldCupAppearances: 7,
    bestResult: '季军(1954)',
    titles: 0,
    squadValue: 300000000,
    squadValueDate: '2026-06-07',
    intro: '奥地利7次参加世界杯，1954年获得季军是最高荣誉。朗尼克执教下，阿拉巴、萨比策等球星让奥地利足球迎来复兴，高位逼抢体系令人耳目一新。',
    tags: ['万福之国', '1954季军', '朗尼克革命', '阿拉巴核心'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'AUT',
    records: [
      { year: 1998, host: '法国', result: '小组赛', finalRank: 14, wins: 0, draws: 2, losses: 1, goalsFor: 3, goalsAgainst: 4, matchesPlayed: 3, note: '1-1平喀麦隆，1-1平意大利' },
      { year: 1990, host: '意大利', result: '小组赛', finalRank: 17, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 3, matchesPlayed: 3, note: '2-1胜美国' },
      { year: 1982, host: '西班牙', result: '小组赛', finalRank: 8, wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 2, matchesPlayed: 3, note: '0-0平西德，与阿尔及利亚默契球' },
      { year: 1978, host: '阿根廷', result: '小组赛', finalRank: 7, wins: 1, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 3, matchesPlayed: 3, note: '3-2胜西德' },
      { year: 1954, host: '瑞士', result: '季军', finalRank: 3, wins: 4, draws: 0, losses: 1, goalsFor: 17, goalsAgainst: 12, matchesPlayed: 5, note: '7-5胜瑞士，3-1胜乌拉圭获季军' },
    ],
    summary: '奥地利7次参加世界杯，1954年获得季军是最高荣誉。7-5胜瑞士是世界杯历史上进球最多的比赛。1978年3-2胜西德和1982年与西德的默契球都令人印象深刻。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'AUT',
    confederation: 'UEFA',
    group: 'C组',
    rank: 2,
    matchesPlayed: 10,
    wins: 6,
    draws: 2,
    losses: 2,
    goalsFor: 18,
    goalsAgainst: 8,
    points: 20,
    qualificationMethod: '欧洲区预选赛C组第2名通过附加赛晋级',
    keyMatches: [
      { date: '2025-10-14', opponent: '瑞典', venue: 'home', score: '2-1', result: 'win', note: '主场力克瑞典' },
      { date: '2026-03-24', opponent: '土耳其', venue: 'neutral', score: '2-1', result: 'win', note: '附加赛击败土耳其' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'aut-story-1',
      teamId: 'AUT',
      type: 'classic_match',
      title: '1954季军战：7-5胜瑞士',
      content: '1954年6月26日，洛桑。世界杯季军争夺战，奥地利7-5击败瑞士。这场比赛是世界杯历史上进球最多的比赛，12个进球让全场观众目瞪口呆。奥地利3-0领先被追至3-3，又5-3领先被追至5-5，最终连入2球7-5获胜。这场比赛被称为"洛桑奇迹"。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'aut-story-2',
      teamId: 'AUT',
      type: 'trivia',
      title: '朗尼克革命：从低谷到复兴',
      content: '拉尔夫·朗尼克2022年接手奥地利国家队，将他在莱比锡和霍芬海姆打造的高位逼抢体系移植到国家队。奥地利在2024年欧洲杯表现出色，2026年世界杯预选赛也展现了强大竞争力。朗尼克的"gegenpressing"革命让奥地利足球从低谷走向复兴。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};

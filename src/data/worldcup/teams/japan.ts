import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = {
  name: 'FIFA官网',
  url: 'https://www.fifa.com',
  level: 'A',
  date: '2026-06-08',
};

const SOURCE_WIKI: import('../../../types/worldcup').DataSource = {
  name: 'Wikipedia',
  level: 'C',
  date: '2026-06-08',
};

const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = {
  name: '体育媒体综合',
  level: 'D',
  date: '2026-06-08',
};

export const JAPAN_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'JPN',
    nameZh: '日本',
    nameEn: 'Japan',
    confederation: 'AFC',
    coachName: '森保一',
    coachNationality: '日本',
    captainName: '吉田麻也',
    fifaRank: 18,
    worldCupAppearances: 7,
    bestResult: '十六强(4次)',
    titles: 0,
    squadValue: 210000000,
    squadValueDate: '2026-06-07',
    intro:
      '日本是亚洲足球的旗帜，7次参加世界杯，4次闯入十六强。从1998年首次参赛到2022年点球负克罗地亚，日本足球的进步有目共睹。森保一执教后，日本在2022年世界杯连续击败德国和西班牙两支前世界冠军，"蓝色武士"的逆袭成为经典。2026年，久保建英、三笘薰等在欧洲联赛效力的球星将带领日本冲击队史首次八强。',
    tags: ['蓝色武士', '4次十六强', '逆转之王', '三笘薰突破', '冲击八强'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'JPN',
    records: [
      { year: 2022, host: '卡塔尔', result: '十六强', finalRank: 9, wins: 2, draws: 1, losses: 1, goalsFor: 5, goalsAgainst: 4, matchesPlayed: 4, note: '2-1胜德国，2-1胜西班牙，点球负克罗地亚' },
      { year: 2018, host: '俄罗斯', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 4, matchesPlayed: 3, note: '2-3负比利时，14秒反击丢球' },
      { year: 2010, host: '南非', result: '十六强', finalRank: 9, wins: 2, draws: 0, losses: 1, goalsFor: 4, goalsAgainst: 2, matchesPlayed: 4, note: '点球负巴拉圭' },
      { year: 2002, host: '韩日', result: '十六强', finalRank: 9, wins: 2, draws: 1, losses: 0, goalsFor: 5, goalsAgainst: 2, matchesPlayed: 4, note: '主场作战，0-1负土耳其' },
      { year: 1998, host: '法国', result: '小组赛', finalRank: 24, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 4, matchesPlayed: 3, note: '首次参赛，三连败' },
    ],
    summary: '日本7次参加世界杯，4次闯入十六强（2002、2010、2018、2022）。2022年连续击败德国和西班牙，展现了亚洲足球的崛起。2026年，日本将全力冲击队史首次八强。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'JPN',
    confederation: 'AFC',
    group: '第三轮B组',
    rank: 1,
    matchesPlayed: 10,
    wins: 7,
    draws: 2,
    losses: 1,
    goalsFor: 22,
    goalsAgainst: 5,
    points: 23,
    qualificationMethod: '亚洲区预选赛第三轮B组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-05', opponent: '澳大利亚', venue: 'home', score: '2-0', result: 'win', note: '主场击败澳大利亚' },
      { date: '2025-10-15', opponent: '沙特阿拉伯', venue: 'away', score: '2-1', result: 'win', note: '客场逆转沙特' },
      { date: '2026-03-25', opponent: '澳大利亚', venue: 'away', score: '1-1', result: 'draw', note: '客场战平锁定晋级' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  storyCards: [
    {
      id: 'jpn-story-1',
      teamId: 'JPN',
      type: 'classic_match',
      title: '2022小组赛：2-1逆转德国',
      content: '2022年11月23日，哈里发国际体育场。日本在世界杯小组赛中2-1逆转四届冠军德国。京多安点球为德国取得领先，但下半场堂安律和浅野拓磨在8分钟内连入两球完成逆转。这是日本世界杯历史上最伟大的胜利之一，也开启了2022年世界杯"亚洲奇迹"的序幕。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'jpn-story-2',
      teamId: 'JPN',
      type: 'classic_match',
      title: '2022小组赛：2-1逆转西班牙',
      content: '2022年11月27日，哈利法国际体育场。日本在小组赛最后一轮2-1逆转2010年冠军西班牙。莫拉塔第11分钟为西班牙取得领先，但堂安律第48分钟扳平，田中碧第51分钟打入制胜球——虽然这个球疑似出界在先，但VAR确认有效。日本以小组第一出线，连续击败两支前世界冠军的壮举震惊世界。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'jpn-story-3',
      teamId: 'JPN',
      type: 'trivia',
      title: '罗斯托夫14秒：最痛心的反击',
      content: '2018年俄罗斯世界杯1/8决赛，日本2-0领先比利时，却被连追两球扳平。比赛进入补时最后时刻，日本获得角球，本田圭佑主罚被库尔图瓦没收，比利时发动快速反击，仅仅14秒后查德利推射空门得手，3-2绝杀日本。这14秒被称为"罗斯托夫的奇迹"，NHK专门制作了纪录片分析这次反击。日本从天堂到地狱只用了14秒，这是世界杯历史上最令人心碎的瞬间之一。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};

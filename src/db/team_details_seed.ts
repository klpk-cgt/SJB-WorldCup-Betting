/**
 * 球队资料种子数据
 * 数据来源：chuifei/world-cup-2026 项目 + 公开信息补充
 * 映射关系：外部项目使用小写id（如spain），本项目使用三字码（如ESP）
 */

import { Player, TeamHistoryResult } from '../types';

// ─── 球队ID映射表（外部id → 本项目id） ───
export const TEAM_ID_MAP: Record<string, string> = {
  spain: 'ESP', france: 'FRA', argentina: 'ARG', brazil: 'BRA',
  england: 'ENG', germany: 'GER', portugal: 'POR', netherlands: 'NED',
  mexico: 'MEX', usa: 'USA', canada: 'CAN', morocco: 'MAR',
  japan: 'JPN', southkorea: 'KOR', belgium: 'BEL', croatia: 'CRO',
  uruguay: 'URU', switzerland: 'SUI', colombia: 'COL', italy: 'ITA',
  turkey: 'TUR', australia: 'AUS', ecuador: 'ECU', senegal: 'SEN',
  sweden: 'SWE', norway: 'NOR', tunisia: 'TUN', iran: 'IRN',
  egypt: 'EGY', qatar: 'QAT', saudiarabia: 'KSA', cotedivoire: 'CIV',
  cameroon: 'CMR', ghana: 'GHA', paraguay: 'PAR', algeria: 'DZA',
  austria: 'AUT', scotland: 'SCO', newzealand: 'NZL', iraq: 'IRQ',
  bosnia: 'BIH', haiti: 'HAI', capeverde: 'CPV', curacao: 'CUR',
  drcongo: 'COD', uzbekistan: 'UZB', jordan: 'JOR', panama: 'PAN',
  czechrepublic: 'CZE', southafrica: 'RSA',
};

// ─── 位置映射（外部 → 本项目） ───
function mapPosition(pos: string): Player['position'] {
  const p = pos.toUpperCase();
  if (p === 'GK') return 'GK';
  if (['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(p)) return 'DEF';
  if (['CM', 'CDM', 'CAM', 'RM', 'LM', 'AM'].includes(p)) return 'MID';
  return 'FWD';
}

// ─── 球员种子数据 ───
export const SEED_PLAYERS: Player[] = [
  // ═══ 西班牙 ESP ═══
  { id: 'esp-1', teamId: 'ESP', name: '乌奈·西蒙', nameZh: '乌奈·西蒙', shirtNumber: 1, position: 'GK', club: '毕尔巴鄂竞技', preferredFoot: '右', marketValue: 8000000 },
  { id: 'esp-2', teamId: 'ESP', name: '大卫·拉亚', nameZh: '大卫·拉亚', shirtNumber: 2, position: 'GK', club: '阿森纳', preferredFoot: '右', marketValue: 8000000 },
  { id: 'esp-3', teamId: 'ESP', name: '库巴西', nameZh: '库巴西', shirtNumber: 4, position: 'DEF', club: '巴塞罗那', preferredFoot: '右', marketValue: 20000000 },
  { id: 'esp-4', teamId: 'ESP', name: '埃里克·加西亚', nameZh: '埃里克·加西亚', shirtNumber: 5, position: 'DEF', club: '巴塞罗那', preferredFoot: '右', marketValue: 20000000 },
  { id: 'esp-5', teamId: 'ESP', name: '拉波尔特', nameZh: '拉波尔特', shirtNumber: 6, position: 'DEF', club: '利雅得新月', preferredFoot: '右', marketValue: 20000000 },
  { id: 'esp-6', teamId: 'ESP', name: '普比尔', nameZh: '普比尔', shirtNumber: 7, position: 'DEF', club: '阿尔梅里亚', preferredFoot: '右', marketValue: 15000000 },
  { id: 'esp-7', teamId: 'ESP', name: '库库雷利亚', nameZh: '库库雷利亚', shirtNumber: 8, position: 'DEF', club: '切尔西', preferredFoot: '右', marketValue: 15000000 },
  { id: 'esp-8', teamId: 'ESP', name: '罗德里', nameZh: '罗德里', shirtNumber: 12, position: 'MID', club: '曼城', preferredFoot: '右', marketValue: 110000000, isCaptain: true },
  { id: 'esp-9', teamId: 'ESP', name: '佩德里', nameZh: '佩德里', shirtNumber: 13, position: 'MID', club: '巴塞罗那', preferredFoot: '右', marketValue: 120000000 },
  { id: 'esp-10', teamId: 'ESP', name: '略伦特', nameZh: '略伦特', shirtNumber: 10, position: 'MID', club: '马德里竞技', preferredFoot: '右', marketValue: 28000000 },
  { id: 'esp-11', teamId: 'ESP', name: '格里马尔多', nameZh: '格里马尔多', shirtNumber: 11, position: 'MID', club: '勒沃库森', preferredFoot: '左', marketValue: 15000000 },
  { id: 'esp-12', teamId: 'ESP', name: '亚马尔', nameZh: '亚马尔', shirtNumber: 19, position: 'FWD', club: '巴塞罗那', preferredFoot: '右', marketValue: 150000000 },
  { id: 'esp-13', teamId: 'ESP', name: '尼科·威廉姆斯', nameZh: '尼科·威廉姆斯', shirtNumber: 20, position: 'FWD', club: '毕尔巴鄂竞技', preferredFoot: '右', marketValue: 70000000 },
  { id: 'esp-14', teamId: 'ESP', name: '奥尔莫', nameZh: '奥尔莫', shirtNumber: 14, position: 'FWD', club: '巴塞罗那', preferredFoot: '右', marketValue: 60000000 },
  { id: 'esp-15', teamId: 'ESP', name: '莫拉塔', nameZh: '莫拉塔', shirtNumber: 15, position: 'FWD', club: 'AC米兰', preferredFoot: '右', marketValue: 16000000 },

  // ═══ 法国 FRA ═══
  { id: 'fra-1', teamId: 'FRA', name: '迈尼昂', nameZh: '迈尼昂', shirtNumber: 1, position: 'GK', club: 'AC米兰', preferredFoot: '右', marketValue: 35000000 },
  { id: 'fra-2', teamId: 'FRA', name: '萨利巴', nameZh: '萨利巴', shirtNumber: 4, position: 'DEF', club: '阿森纳', preferredFoot: '右', marketValue: 80000000 },
  { id: 'fra-3', teamId: 'FRA', name: '于帕梅卡诺', nameZh: '于帕梅卡诺', shirtNumber: 5, position: 'DEF', club: '拜仁慕尼黑', preferredFoot: '右', marketValue: 50000000 },
  { id: 'fra-4', teamId: 'FRA', name: '孔德', nameZh: '孔德', shirtNumber: 2, position: 'DEF', club: '巴塞罗那', preferredFoot: '右', marketValue: 55000000 },
  { id: 'fra-5', teamId: 'FRA', name: '特奥', nameZh: '特奥', shirtNumber: 3, position: 'DEF', club: 'AC米兰', preferredFoot: '右', marketValue: 55000000 },
  { id: 'fra-6', teamId: 'FRA', name: '坎特', nameZh: '坎特', shirtNumber: 6, position: 'MID', club: '吉达联合', preferredFoot: '右', marketValue: 10000000 },
  { id: 'fra-7', teamId: 'FRA', name: '琼阿梅尼', nameZh: '琼阿梅尼', shirtNumber: 8, position: 'MID', club: '皇家马德里', preferredFoot: '右', marketValue: 90000000 },
  { id: 'fra-8', teamId: 'FRA', name: '格列兹曼', nameZh: '格列兹曼', shirtNumber: 7, position: 'MID', club: '马德里竞技', preferredFoot: '左', marketValue: 25000000 },
  { id: 'fra-9', teamId: 'FRA', name: '姆巴佩', nameZh: '姆巴佩', shirtNumber: 10, position: 'FWD', club: '皇家马德里', preferredFoot: '右', marketValue: 180000000, isCaptain: true },
  { id: 'fra-10', teamId: 'FRA', name: '登贝莱', nameZh: '登贝莱', shirtNumber: 11, position: 'FWD', club: '巴黎圣日耳曼', preferredFoot: '左', marketValue: 60000000 },
  { id: 'fra-11', teamId: 'FRA', name: '穆阿尼', nameZh: '穆阿尼', shirtNumber: 9, position: 'FWD', club: '尤文图斯', preferredFoot: '右', marketValue: 30000000 },

  // ═══ 阿根廷 ARG ═══
  { id: 'arg-1', teamId: 'ARG', name: '马丁内斯', nameZh: '马丁内斯', shirtNumber: 1, position: 'GK', club: '阿斯顿维拉', preferredFoot: '右', marketValue: 25000000 },
  { id: 'arg-2', teamId: 'ARG', name: '罗梅罗', nameZh: '罗梅罗', shirtNumber: 4, position: 'DEF', club: '托特纳姆热刺', preferredFoot: '右', marketValue: 55000000 },
  { id: 'arg-3', teamId: 'ARG', name: '奥塔门迪', nameZh: '奥塔门迪', shirtNumber: 5, position: 'DEF', club: '本菲卡', preferredFoot: '右', marketValue: 3000000 },
  { id: 'arg-4', teamId: 'ARG', name: '莫利纳', nameZh: '莫利纳', shirtNumber: 2, position: 'DEF', club: '马德里竞技', preferredFoot: '右', marketValue: 25000000 },
  { id: 'arg-5', teamId: 'ARG', name: '阿库尼亚', nameZh: '阿库尼亚', shirtNumber: 3, position: 'DEF', club: '河床', preferredFoot: '左', marketValue: 5000000 },
  { id: 'arg-6', teamId: 'ARG', name: '德保罗', nameZh: '德保罗', shirtNumber: 7, position: 'MID', club: '马德里竞技', preferredFoot: '右', marketValue: 35000000 },
  { id: 'arg-7', teamId: 'ARG', name: '恩佐·费尔南德斯', nameZh: '恩佐·费尔南德斯', shirtNumber: 8, position: 'MID', club: '切尔西', preferredFoot: '右', marketValue: 65000000 },
  { id: 'arg-8', teamId: 'ARG', name: '麦卡利斯特', nameZh: '麦卡利斯特', shirtNumber: 6, position: 'MID', club: '利物浦', preferredFoot: '左', marketValue: 70000000 },
  { id: 'arg-9', teamId: 'ARG', name: '梅西', nameZh: '梅西', shirtNumber: 10, position: 'FWD', club: '迈阿密国际', preferredFoot: '左', marketValue: 30000000, isCaptain: true },
  { id: 'arg-10', teamId: 'ARG', name: '劳塔罗', nameZh: '劳塔罗', shirtNumber: 9, position: 'FWD', club: '国际米兰', preferredFoot: '右', marketValue: 90000000 },
  { id: 'arg-11', teamId: 'ARG', name: '阿尔瓦雷斯', nameZh: '阿尔瓦雷斯', shirtNumber: 11, position: 'FWD', club: '马德里竞技', preferredFoot: '右', marketValue: 70000000 },

  // ═══ 巴西 BRA ═══
  { id: 'bra-1', teamId: 'BRA', name: '阿利松', nameZh: '阿利松', shirtNumber: 1, position: 'GK', club: '利物浦', preferredFoot: '右', marketValue: 30000000 },
  { id: 'bra-2', teamId: 'BRA', name: '马尔基尼奥斯', nameZh: '马尔基尼奥斯', shirtNumber: 4, position: 'DEF', club: '巴黎圣日耳曼', preferredFoot: '右', marketValue: 40000000 },
  { id: 'bra-3', teamId: 'BRA', name: '米利唐', nameZh: '米利唐', shirtNumber: 3, position: 'DEF', club: '皇家马德里', preferredFoot: '右', marketValue: 55000000 },
  { id: 'bra-4', teamId: 'BRA', name: '达尼洛', nameZh: '达尼洛', shirtNumber: 2, position: 'DEF', club: '尤文图斯', preferredFoot: '右', marketValue: 8000000 },
  { id: 'bra-5', teamId: 'BRA', name: '吉马良斯', nameZh: '吉马良斯', shirtNumber: 8, position: 'MID', club: '纽卡斯尔', preferredFoot: '右', marketValue: 70000000 },
  { id: 'bra-6', teamId: 'BRA', name: '帕奎塔', nameZh: '帕奎塔', shirtNumber: 7, position: 'MID', club: '西汉姆', preferredFoot: '左', marketValue: 40000000 },
  { id: 'bra-7', teamId: 'BRA', name: '维尼修斯', nameZh: '维尼修斯', shirtNumber: 10, position: 'FWD', club: '皇家马德里', preferredFoot: '右', marketValue: 200000000 },
  { id: 'bra-8', teamId: 'BRA', name: '罗德里戈', nameZh: '罗德里戈', shirtNumber: 11, position: 'FWD', club: '皇家马德里', preferredFoot: '右', marketValue: 100000000 },
  { id: 'bra-9', teamId: 'BRA', name: '内马尔', nameZh: '内马尔', shirtNumber: 9, position: 'FWD', club: '桑托斯', preferredFoot: '右', marketValue: 15000000 },

  // ═══ 英格兰 ENG ═══
  { id: 'eng-1', teamId: 'ENG', name: '皮克福德', nameZh: '皮克福德', shirtNumber: 1, position: 'GK', club: '埃弗顿', preferredFoot: '右', marketValue: 20000000 },
  { id: 'eng-2', teamId: 'ENG', name: '斯通斯', nameZh: '斯通斯', shirtNumber: 5, position: 'DEF', club: '曼城', preferredFoot: '右', marketValue: 35000000 },
  { id: 'eng-3', teamId: 'ENG', name: '沃克', nameZh: '沃克', shirtNumber: 2, position: 'DEF', club: '曼城', preferredFoot: '右', marketValue: 12000000 },
  { id: 'eng-4', teamId: 'ENG', name: '阿诺德', nameZh: '阿诺德', shirtNumber: 3, position: 'DEF', club: '皇家马德里', preferredFoot: '右', marketValue: 70000000 },
  { id: 'eng-5', teamId: 'ENG', name: '赖斯', nameZh: '赖斯', shirtNumber: 6, position: 'MID', club: '阿森纳', preferredFoot: '右', marketValue: 100000000 },
  { id: 'eng-6', teamId: 'ENG', name: '贝林厄姆', nameZh: '贝林厄姆', shirtNumber: 8, position: 'MID', club: '皇家马德里', preferredFoot: '右', marketValue: 150000000 },
  { id: 'eng-7', teamId: 'ENG', name: '福登', nameZh: '福登', shirtNumber: 7, position: 'MID', club: '曼城', preferredFoot: '左', marketValue: 120000000 },
  { id: 'eng-8', teamId: 'ENG', name: '凯恩', nameZh: '凯恩', shirtNumber: 9, position: 'FWD', club: '拜仁慕尼黑', preferredFoot: '右', marketValue: 80000000, isCaptain: true },
  { id: 'eng-9', teamId: 'ENG', name: '萨卡', nameZh: '萨卡', shirtNumber: 10, position: 'FWD', club: '阿森纳', preferredFoot: '左', marketValue: 140000000 },

  // ═══ 德国 GER ═══
  { id: 'ger-1', teamId: 'GER', name: '诺伊尔', nameZh: '诺伊尔', shirtNumber: 1, position: 'GK', club: '拜仁慕尼黑', preferredFoot: '右', marketValue: 5000000 },
  { id: 'ger-2', teamId: 'GER', name: '吕迪格', nameZh: '吕迪格', shirtNumber: 4, position: 'DEF', club: '皇家马德里', preferredFoot: '右', marketValue: 35000000 },
  { id: 'ger-3', teamId: 'GER', name: '塔', nameZh: '塔', shirtNumber: 5, position: 'DEF', club: '勒沃库森', preferredFoot: '右', marketValue: 25000000 },
  { id: 'ger-4', teamId: 'GER', name: '基米希', nameZh: '基米希', shirtNumber: 6, position: 'MID', club: '拜仁慕尼黑', preferredFoot: '右', marketValue: 50000000, isCaptain: true },
  { id: 'ger-5', teamId: 'GER', name: '穆西亚拉', nameZh: '穆西亚拉', shirtNumber: 8, position: 'MID', club: '拜仁慕尼黑', preferredFoot: '右', marketValue: 140000000 },
  { id: 'ger-6', teamId: 'GER', name: '维尔茨', nameZh: '维尔茨', shirtNumber: 7, position: 'MID', club: '勒沃库森', preferredFoot: '右', marketValue: 130000000 },
  { id: 'ger-7', teamId: 'GER', name: '哈弗茨', nameZh: '哈弗茨', shirtNumber: 9, position: 'FWD', club: '阿森纳', preferredFoot: '右', marketValue: 60000000 },
  { id: 'ger-8', teamId: 'GER', name: '萨内', nameZh: '萨内', shirtNumber: 10, position: 'FWD', club: '拜仁慕尼黑', preferredFoot: '右', marketValue: 40000000 },

  // ═══ 葡萄牙 POR ═══
  { id: 'por-1', teamId: 'POR', name: '迪奥戈·科斯塔', nameZh: '迪奥戈·科斯塔', shirtNumber: 1, position: 'GK', club: '波尔图', preferredFoot: '右', marketValue: 35000000 },
  { id: 'por-2', teamId: 'POR', name: '鲁本·迪亚斯', nameZh: '鲁本·迪亚斯', shirtNumber: 4, position: 'DEF', club: '曼城', preferredFoot: '右', marketValue: 60000000 },
  { id: 'por-3', teamId: 'POR', name: '坎塞洛', nameZh: '坎塞洛', shirtNumber: 2, position: 'DEF', club: '巴塞罗那', preferredFoot: '右', marketValue: 25000000 },
  { id: 'por-4', teamId: 'POR', name: 'B·席尔瓦', nameZh: 'B·席尔瓦', shirtNumber: 8, position: 'MID', club: '曼城', preferredFoot: '右', marketValue: 40000000 },
  { id: 'por-5', teamId: 'POR', name: '布鲁诺·费尔南德斯', nameZh: '布鲁诺·费尔南德斯', shirtNumber: 6, position: 'MID', club: '曼联', preferredFoot: '右', marketValue: 55000000 },
  { id: 'por-6', teamId: 'POR', name: '莱奥', nameZh: '莱奥', shirtNumber: 7, position: 'FWD', club: 'AC米兰', preferredFoot: '右', marketValue: 75000000 },
  { id: 'por-7', teamId: 'POR', name: 'C罗', nameZh: 'C罗', shirtNumber: 10, position: 'FWD', club: '利雅得胜利', preferredFoot: '右', marketValue: 15000000, isCaptain: true },

  // ═══ 荷兰 NED ═══
  { id: 'ned-1', teamId: 'NED', name: '费布鲁亨', nameZh: '费布鲁亨', shirtNumber: 1, position: 'GK', club: '布莱顿', preferredFoot: '右', marketValue: 30000000 },
  { id: 'ned-2', teamId: 'NED', name: '范戴克', nameZh: '范戴克', shirtNumber: 4, position: 'DEF', club: '利物浦', preferredFoot: '左', marketValue: 35000000, isCaptain: true },
  { id: 'ned-3', teamId: 'NED', name: '阿克', nameZh: '阿克', shirtNumber: 5, position: 'DEF', club: '曼城', preferredFoot: '左', marketValue: 25000000 },
  { id: 'ned-4', teamId: 'NED', name: '德容', nameZh: '德容', shirtNumber: 8, position: 'MID', club: '巴塞罗那', preferredFoot: '右', marketValue: 60000000 },
  { id: 'ned-5', teamId: 'NED', name: '西蒙斯', nameZh: '西蒙斯', shirtNumber: 7, position: 'MID', club: 'RB莱比锡', preferredFoot: '右', marketValue: 70000000 },
  { id: 'ned-6', teamId: 'NED', name: '加克波', nameZh: '加克波', shirtNumber: 9, position: 'FWD', club: '利物浦', preferredFoot: '右', marketValue: 55000000 },
  { id: 'ned-7', teamId: 'NED', name: '德佩', nameZh: '德佩', shirtNumber: 10, position: 'FWD', club: '科林蒂安', preferredFoot: '右', marketValue: 8000000 },

  // ═══ 比利时 BEL ═══
  { id: 'bel-1', teamId: 'BEL', name: '库尔图瓦', nameZh: '库尔图瓦', shirtNumber: 1, position: 'GK', club: '皇家马德里', preferredFoot: '右', marketValue: 20000000 },
  { id: 'bel-2', teamId: 'BEL', name: '德巴斯特', nameZh: '德巴斯特', shirtNumber: 4, position: 'DEF', club: '葡萄牙体育', preferredFoot: '右', marketValue: 25000000 },
  { id: 'bel-3', teamId: 'BEL', name: '德布劳内', nameZh: '德布劳内', shirtNumber: 8, position: 'MID', club: '曼城', preferredFoot: '右', marketValue: 50000000, isCaptain: true },
  { id: 'bel-4', teamId: 'BEL', name: '蒂勒曼斯', nameZh: '蒂勒曼斯', shirtNumber: 6, position: 'MID', club: '阿斯顿维拉', preferredFoot: '右', marketValue: 35000000 },
  { id: 'bel-5', teamId: 'BEL', name: '卢卡库', nameZh: '卢卡库', shirtNumber: 9, position: 'FWD', club: '那不勒斯', preferredFoot: '左', marketValue: 25000000 },
  { id: 'bel-6', teamId: 'BEL', name: '多库', nameZh: '多库', shirtNumber: 10, position: 'FWD', club: '曼城', preferredFoot: '右', marketValue: 40000000 },

  // ═══ 克罗地亚 CRO ═══
  { id: 'cro-1', teamId: 'CRO', name: '利瓦科维奇', nameZh: '利瓦科维奇', shirtNumber: 1, position: 'GK', club: '费内巴切', preferredFoot: '右', marketValue: 15000000 },
  { id: 'cro-2', teamId: 'CRO', name: '格瓦迪奥尔', nameZh: '格瓦迪奥尔', shirtNumber: 4, position: 'DEF', club: '曼城', preferredFoot: '左', marketValue: 55000000 },
  { id: 'cro-3', teamId: 'CRO', name: '莫德里奇', nameZh: '莫德里奇', shirtNumber: 10, position: 'MID', club: '皇家马德里', preferredFoot: '右', marketValue: 8000000, isCaptain: true },
  { id: 'cro-4', teamId: 'CRO', name: '科瓦契奇', nameZh: '科瓦契奇', shirtNumber: 8, position: 'MID', club: '曼城', preferredFoot: '右', marketValue: 20000000 },
  { id: 'cro-5', teamId: 'CRO', name: '克拉马里奇', nameZh: '克拉马里奇', shirtNumber: 9, position: 'FWD', club: '霍芬海姆', preferredFoot: '右', marketValue: 6000000 },
];

// ─── 球队历史战绩种子数据 ───
export const SEED_TEAM_HISTORY: TeamHistoryResult[] = [
  // ═══ 西班牙 ESP ═══
  { id: 'esp-h1', teamId: 'ESP', year: 2022, host: '卡塔尔', result: '十六强', matchesPlayed: 4, wins: 1, draws: 2, losses: 1, goalsFor: 9, goalsAgainst: 3 },
  { id: 'esp-h2', teamId: 'ESP', year: 2018, host: '俄罗斯', result: '十六强', matchesPlayed: 4, wins: 1, draws: 3, losses: 0, goalsFor: 7, goalsAgainst: 6 },
  { id: 'esp-h3', teamId: 'ESP', year: 2014, host: '巴西', result: '小组赛', matchesPlayed: 3, wins: 1, draws: 0, losses: 2, goalsFor: 4, goalsAgainst: 7 },
  { id: 'esp-h4', teamId: 'ESP', year: 2010, host: '南非', result: '冠军', matchesPlayed: 7, wins: 6, draws: 0, losses: 1, goalsFor: 8, goalsAgainst: 2 },

  // ═══ 法国 FRA ═══
  { id: 'fra-h1', teamId: 'FRA', year: 2022, host: '卡塔尔', result: '亚军', matchesPlayed: 7, wins: 5, draws: 0, losses: 2, goalsFor: 14, goalsAgainst: 8 },
  { id: 'fra-h2', teamId: 'FRA', year: 2018, host: '俄罗斯', result: '冠军', matchesPlayed: 7, wins: 6, draws: 1, losses: 0, goalsFor: 14, goalsAgainst: 6 },
  { id: 'fra-h3', teamId: 'FRA', year: 2014, host: '巴西', result: '八强', matchesPlayed: 5, wins: 3, draws: 1, losses: 1, goalsFor: 10, goalsAgainst: 5 },

  // ═══ 阿根廷 ARG ═══
  { id: 'arg-h1', teamId: 'ARG', year: 2022, host: '卡塔尔', result: '冠军', matchesPlayed: 7, wins: 5, draws: 2, losses: 0, goalsFor: 13, goalsAgainst: 5 },
  { id: 'arg-h2', teamId: 'ARG', year: 2018, host: '俄罗斯', result: '十六强', matchesPlayed: 4, wins: 1, draws: 1, losses: 2, goalsFor: 3, goalsAgainst: 6 },
  { id: 'arg-h3', teamId: 'ARG', year: 2014, host: '巴西', result: '亚军', matchesPlayed: 7, wins: 4, draws: 2, losses: 1, goalsFor: 8, goalsAgainst: 4 },

  // ═══ 巴西 BRA ═══
  { id: 'bra-h1', teamId: 'BRA', year: 2022, host: '卡塔尔', result: '八强', matchesPlayed: 5, wins: 3, draws: 1, losses: 1, goalsFor: 8, goalsAgainst: 6 },
  { id: 'bra-h2', teamId: 'BRA', year: 2018, host: '俄罗斯', result: '八强', matchesPlayed: 5, wins: 3, draws: 1, losses: 1, goalsFor: 8, goalsAgainst: 3 },
  { id: 'bra-h3', teamId: 'BRA', year: 2014, host: '巴西', result: '殿军', matchesPlayed: 7, wins: 3, draws: 2, losses: 2, goalsFor: 11, goalsAgainst: 14 },

  // ═══ 英格兰 ENG ═══
  { id: 'eng-h1', teamId: 'ENG', year: 2022, host: '卡塔尔', result: '八强', matchesPlayed: 5, wins: 3, draws: 1, losses: 1, goalsFor: 9, goalsAgainst: 4 },
  { id: 'eng-h2', teamId: 'ENG', year: 2018, host: '俄罗斯', result: '殿军', matchesPlayed: 7, wins: 3, draws: 1, losses: 3, goalsFor: 9, goalsAgainst: 7 },

  // ═══ 德国 GER ═══
  { id: 'ger-h1', teamId: 'GER', year: 2022, host: '卡塔尔', result: '小组赛', matchesPlayed: 3, wins: 1, draws: 1, losses: 1, goalsFor: 6, goalsAgainst: 5 },
  { id: 'ger-h2', teamId: 'GER', year: 2018, host: '俄罗斯', result: '小组赛', matchesPlayed: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 4 },
  { id: 'ger-h3', teamId: 'GER', year: 2014, host: '巴西', result: '冠军', matchesPlayed: 7, wins: 6, draws: 1, losses: 0, goalsFor: 18, goalsAgainst: 4 },

  // ═══ 葡萄牙 POR ═══
  { id: 'por-h1', teamId: 'POR', year: 2022, host: '卡塔尔', result: '八强', matchesPlayed: 5, wins: 2, draws: 1, losses: 2, goalsFor: 6, goalsAgainst: 6 },
  { id: 'por-h2', teamId: 'POR', year: 2018, host: '俄罗斯', result: '十六强', matchesPlayed: 4, wins: 1, draws: 2, losses: 1, goalsFor: 5, goalsAgainst: 4 },

  // ═══ 荷兰 NED ═══
  { id: 'ned-h1', teamId: 'NED', year: 2022, host: '卡塔尔', result: '八强', matchesPlayed: 5, wins: 3, draws: 1, losses: 1, goalsFor: 10, goalsAgainst: 4 },
  { id: 'ned-h2', teamId: 'NED', year: 2014, host: '巴西', result: '季军', matchesPlayed: 7, wins: 4, draws: 1, losses: 2, goalsFor: 15, goalsAgainst: 4 },

  // ═══ 比利时 BEL ═══
  { id: 'bel-h1', teamId: 'BEL', year: 2022, host: '卡塔尔', result: '小组赛', matchesPlayed: 3, wins: 1, draws: 0, losses: 2, goalsFor: 1, goalsAgainst: 2 },
  { id: 'bel-h2', teamId: 'BEL', year: 2018, host: '俄罗斯', result: '季军', matchesPlayed: 7, wins: 5, draws: 0, losses: 2, goalsFor: 14, goalsAgainst: 6 },

  // ═══ 克罗地亚 CRO ═══
  { id: 'cro-h1', teamId: 'CRO', year: 2022, host: '卡塔尔', result: '季军', matchesPlayed: 7, wins: 3, draws: 2, losses: 2, goalsFor: 8, goalsAgainst: 7 },
  { id: 'cro-h2', teamId: 'CRO', year: 2018, host: '俄罗斯', result: '亚军', matchesPlayed: 7, wins: 3, draws: 2, losses: 2, goalsFor: 9, goalsAgainst: 6 },

  // ═══ 乌拉圭 URU ═══
  { id: 'uru-h1', teamId: 'URU', year: 2022, host: '卡塔尔', result: '小组赛', matchesPlayed: 3, wins: 0, draws: 2, losses: 1, goalsFor: 2, goalsAgainst: 4 },
  { id: 'uru-h2', teamId: 'URU', year: 2018, host: '俄罗斯', result: '八强', matchesPlayed: 5, wins: 3, draws: 0, losses: 2, goalsFor: 7, goalsAgainst: 5 },

  // ═══ 墨西哥 MEX ═══
  { id: 'mex-h1', teamId: 'MEX', year: 2022, host: '卡塔尔', result: '小组赛', matchesPlayed: 3, wins: 1, draws: 1, losses: 1, goalsFor: 2, goalsAgainst: 3 },
  { id: 'mex-h2', teamId: 'MEX', year: 2018, host: '俄罗斯', result: '十六强', matchesPlayed: 4, wins: 2, draws: 0, losses: 2, goalsFor: 3, goalsAgainst: 5 },

  // ═══ 美国 USA ═══
  { id: 'usa-h1', teamId: 'USA', year: 2022, host: '卡塔尔', result: '十六强', matchesPlayed: 4, wins: 1, draws: 2, losses: 1, goalsFor: 3, goalsAgainst: 4 },

  // ═══ 摩洛哥 MAR ═══
  { id: 'mar-h1', teamId: 'MAR', year: 2022, host: '卡塔尔', result: '殿军', matchesPlayed: 7, wins: 3, draws: 2, losses: 2, goalsFor: 6, goalsAgainst: 5 },

  // ═══ 日本 JPN ═══
  { id: 'jpn-h1', teamId: 'JPN', year: 2022, host: '卡塔尔', result: '十六强', matchesPlayed: 4, wins: 2, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 4 },

  // ═══ 瑞士 SUI ═══
  { id: 'sui-h1', teamId: 'SUI', year: 2022, host: '卡塔尔', result: '十六强', matchesPlayed: 4, wins: 2, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 8 },

  // ═══ 塞内加尔 SEN ═══
  { id: 'sen-h1', teamId: 'SEN', year: 2022, host: '卡塔尔', result: '十六强', matchesPlayed: 4, wins: 2, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 5 },

  // ═══ 厄瓜多尔 ECU ═══
  { id: 'ecu-h1', teamId: 'ECU', year: 2022, host: '卡塔尔', result: '小组赛', matchesPlayed: 3, wins: 1, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 3 },

  // ═══ 突尼斯 TUN ═══
  { id: 'tun-h1', teamId: 'TUN', year: 2022, host: '卡塔尔', result: '小组赛', matchesPlayed: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 4 },

  // ═══ 澳大利亚 AUS ═══
  { id: 'aus-h1', teamId: 'AUS', year: 2022, host: '卡塔尔', result: '十六强', matchesPlayed: 4, wins: 2, draws: 0, losses: 2, goalsFor: 4, goalsAgainst: 6 },

  // ═══ 加纳 GHA ═══
  { id: 'gha-h1', teamId: 'GHA', year: 2022, host: '卡塔尔', result: '小组赛', matchesPlayed: 3, wins: 1, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 7 },

  // ═══ 喀麦隆 CMR ═══
  { id: 'cmr-h1', teamId: 'CMR', year: 2022, host: '卡塔尔', result: '小组赛', matchesPlayed: 3, wins: 1, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 4 },

  // ═══ 韩国 KOR ═══
  { id: 'kor-h1', teamId: 'KOR', year: 2022, host: '卡塔尔', result: '十六强', matchesPlayed: 4, wins: 1, draws: 1, losses: 2, goalsFor: 5, goalsAgainst: 7 },

  // ═══ 意大利 ITA ═══
  { id: 'ita-h1', teamId: 'ITA', year: 2014, host: '巴西', result: '小组赛', matchesPlayed: 3, wins: 0, draws: 1, losses: 2, goalsFor: 2, goalsAgainst: 5 },

  // ═══ 土耳其 TUR ═══
  { id: 'tur-h1', teamId: 'TUR', year: 2002, host: '韩日', result: '季军', matchesPlayed: 7, wins: 4, draws: 1, losses: 2, goalsFor: 10, goalsAgainst: 6 },

  // ═══ 哥伦比亚 COL ═══
  { id: 'col-h1', teamId: 'COL', year: 2018, host: '俄罗斯', result: '十六强', matchesPlayed: 4, wins: 2, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 4 },

  // ═══ 伊朗 IRN ═══
  { id: 'irn-h1', teamId: 'IRN', year: 2022, host: '卡塔尔', result: '小组赛', matchesPlayed: 3, wins: 1, draws: 0, losses: 2, goalsFor: 4, goalsAgainst: 7 },

  // ═══ 沙特 KSA ═══
  { id: 'ksa-h1', teamId: 'KSA', year: 2022, host: '卡塔尔', result: '小组赛', matchesPlayed: 3, wins: 1, draws: 0, losses: 2, goalsFor: 3, goalsAgainst: 5 },

  // ═══ 卡塔尔 QAT ═══
  { id: 'qat-h1', teamId: 'QAT', year: 2022, host: '卡塔尔', result: '小组赛', matchesPlayed: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 7 },
];

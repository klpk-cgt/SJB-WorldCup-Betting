/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Team, Match, MatchOdds, MatchStatus, GroupRoom } from '../types';
import { generateDefaultOdds } from '../utils/odds';

export const SEED_ROOMS: GroupRoom[] = [
  {
    id: 'room-1',
    name: '兄弟观赛竞猜团',
    slug: 'brothers',
    inviteCode: '123456',
    description: '2026美加墨世界杯狂欢！大家一起吹牛聊天竞猜，谁才是终极预测王？',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'room-2',
    name: '狂热球迷俱乐部',
    slug: 'fans',
    inviteCode: '888888',
    description: '足球反向明灯聚集地，猜最野的冷门，拿最酷的称号！',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export const THE_TEAMS: Team[] = [
  // A组
  { id: 'MEX', name: 'Mexico', nameZh: '墨西哥', code: 'MEX', logoUrl: '/flags/mx.png', groupName: 'Group A', fifaRank: 15, confederation: 'CONCACAF', coachName: '哈梅·洛萨诺', coachNationality: '墨西哥', formation: '4-3-3', worldCupAppearances: 17, bestResult: '八强 (1970, 1986)', primaryColor: '#006847', secondaryColor: '#CE1126' },
  { id: 'RSA', name: 'South Africa', nameZh: '南非', code: 'RSA', logoUrl: '/flags/za.png', groupName: 'Group A', fifaRank: 58, confederation: 'CAF', coachName: '雨果·布鲁斯', coachNationality: '比利时', formation: '4-4-2', worldCupAppearances: 3, bestResult: '小组赛 (1998, 2002, 2010)', primaryColor: '#007749', secondaryColor: '#FFB81C' },
  { id: 'CZE', name: 'Czech Republic', nameZh: '捷克', code: 'CZE', logoUrl: '/flags/cz.png', groupName: 'Group A', fifaRank: 42, confederation: 'UEFA', coachName: '伊万·哈谢克', coachNationality: '捷克', formation: '4-2-3-1', worldCupAppearances: 1, bestResult: '小组赛 (2006)', primaryColor: '#D7141A', secondaryColor: '#FFFFFF' },
  { id: 'CMR', name: 'Cameroon', nameZh: '喀麦隆', code: 'CMR', logoUrl: '/flags/cm.png', groupName: 'Group A', fifaRank: 38, confederation: 'CAF', coachName: '里戈贝特·宋', coachNationality: '喀麦隆', formation: '4-3-3', worldCupAppearances: 8, bestResult: '八强 (1990)', primaryColor: '#006633', secondaryColor: '#CC0000' },
  // B组
  { id: 'CAN', name: 'Canada', nameZh: '加拿大', code: 'CAN', logoUrl: '/flags/ca.png', groupName: 'Group B', fifaRank: 47, confederation: 'CONCACAF', coachName: '杰西·马施', coachNationality: '美国', formation: '4-4-2', worldCupAppearances: 2, bestResult: '小组赛 (1986, 2022)', primaryColor: '#FF0000', secondaryColor: '#FFFFFF' },
  { id: 'BIH', name: 'Bosnia and Herzegovina', nameZh: '波黑', code: 'BIH', logoUrl: '/flags/ba.png', groupName: 'Group B', fifaRank: 59, confederation: 'UEFA', coachName: '萨菲特·苏希奇', coachNationality: '波黑', formation: '4-2-3-1', worldCupAppearances: 1, bestResult: '小组赛 (2014)', primaryColor: '#002395', secondaryColor: '#FECB00' },
  { id: 'QAT', name: 'Qatar', nameZh: '卡塔尔', code: 'QAT', logoUrl: '/flags/qa.png', groupName: 'Group B', fifaRank: 52, confederation: 'AFC', coachName: '马尔克斯', coachNationality: '西班牙', formation: '5-3-2', worldCupAppearances: 1, bestResult: '小组赛 (2022)', primaryColor: '#8A1538', secondaryColor: '#FFFFFF' },
  { id: 'SUI', name: 'Switzerland', nameZh: '瑞士', code: 'SUI', logoUrl: '/flags/ch.png', groupName: 'Group B', fifaRank: 16, confederation: 'UEFA', coachName: '穆拉特·雅金', coachNationality: '瑞士', formation: '3-4-2-1', worldCupAppearances: 12, bestResult: '八强 (1934, 1938, 1954)', primaryColor: '#FF0000', secondaryColor: '#FFFFFF' },
  // C组
  { id: 'BRA', name: 'Brazil', nameZh: '巴西', code: 'BRA', logoUrl: '/flags/br.png', groupName: 'Group C', fifaRank: 5, confederation: 'CONMEBOL', coachName: '多里瓦尔', coachNationality: '巴西', formation: '4-3-3', worldCupAppearances: 22, bestResult: '冠军 (1958, 1962, 1970, 1994, 2002)', heroPlayerNames: ['维尼修斯', '罗德里戈', '内马尔'], primaryColor: '#009739', secondaryColor: '#FEDD00' },
  { id: 'MAR', name: 'Morocco', nameZh: '摩洛哥', code: 'MAR', logoUrl: '/flags/ma.png', groupName: 'Group C', fifaRank: 13, confederation: 'CAF', coachName: '瓦利德·雷格拉吉', coachNationality: '摩洛哥', formation: '4-2-3-1', worldCupAppearances: 6, bestResult: '殿军 (2022)', primaryColor: '#C1272D', secondaryColor: '#006233' },
  { id: 'HAI', name: 'Haiti', nameZh: '海地', code: 'HAI', logoUrl: '/flags/ht.png', groupName: 'Group C', fifaRank: 78, confederation: 'CONCACAF', coachName: '加布里埃尔·卡尔维特', coachNationality: '法国', formation: '4-4-2', worldCupAppearances: 1, bestResult: '小组赛 (1974)', primaryColor: '#00209F', secondaryColor: '#D21034' },
  { id: 'SCO', name: 'Scotland', nameZh: '苏格兰', code: 'SCO', logoUrl: '/flags/gb-sct.png', groupName: 'Group C', fifaRank: 44, confederation: 'UEFA', coachName: '史蒂夫·克拉克', coachNationality: '苏格兰', formation: '5-4-1', worldCupAppearances: 8, bestResult: '小组赛 (多次)', primaryColor: '#003087', secondaryColor: '#FFFFFF' },
  // D组
  { id: 'USA', name: 'USA', nameZh: '美国', code: 'USA', logoUrl: '/flags/us.png', groupName: 'Group D', fifaRank: 14, confederation: 'CONCACAF', coachName: '毛里西奥·波切蒂诺', coachNationality: '阿根廷', formation: '4-3-3', worldCupAppearances: 11, bestResult: '季军 (1930)', heroPlayerNames: ['普利西奇', '麦肯尼', '雷纳'], primaryColor: '#002868', secondaryColor: '#BF0A30' },
  { id: 'PAR', name: 'Paraguay', nameZh: '巴拉圭', code: 'PAR', logoUrl: '/flags/py.png', groupName: 'Group D', fifaRank: 53, confederation: 'CONMEBOL', coachName: '古斯塔沃·阿尔法罗', coachNationality: '阿根廷', formation: '4-4-2', worldCupAppearances: 10, bestResult: '八强 (2010)', primaryColor: '#D52B1E', secondaryColor: '#0038A8' },
  { id: 'AUS', name: 'Australia', nameZh: '澳大利亚', code: 'AUS', logoUrl: '/flags/au.png', groupName: 'Group D', fifaRank: 25, confederation: 'AFC', coachName: '托尼·波波维奇', coachNationality: '澳大利亚', formation: '4-4-2', worldCupAppearances: 6, bestResult: '十六强 (2006, 2022)', primaryColor: '#00843D', secondaryColor: '#FFCD00' },
  { id: 'TUR', name: 'Turkey', nameZh: '土耳其', code: 'TUR', logoUrl: '/flags/tr.png', groupName: 'Group D', fifaRank: 37, confederation: 'UEFA', coachName: '文森佐·蒙特拉', coachNationality: '意大利', formation: '4-2-3-1', worldCupAppearances: 2, bestResult: '季军 (2002)', primaryColor: '#E30A17', secondaryColor: '#FFFFFF' },
  // E组
  { id: 'GER', name: 'Germany', nameZh: '德国', code: 'GER', logoUrl: '/flags/de.png', groupName: 'Group E', fifaRank: 9, confederation: 'UEFA', coachName: '纳格尔斯曼', coachNationality: '德国', formation: '4-2-3-1', worldCupAppearances: 20, bestResult: '冠军 (1954, 1974, 1990, 2014)', heroPlayerNames: ['穆西亚拉', '维尔茨', '哈弗茨'], primaryColor: '#000000', secondaryColor: '#DD0000' },
  { id: 'CUR', name: 'Curaçao', nameZh: '库拉索', code: 'CUR', logoUrl: '/flags/cw.png', groupName: 'Group E', fifaRank: 72, confederation: 'CONCACAF', coachName: '迪克·阿德沃卡特', coachNationality: '荷兰', formation: '4-3-3', worldCupAppearances: 0, bestResult: '首次参赛', primaryColor: '#002B7F', secondaryColor: '#F9E814' },
  { id: 'CIV', name: "Côte d'Ivoire", nameZh: '科特迪瓦', code: 'CIV', logoUrl: '/flags/ci.png', groupName: 'Group E', fifaRank: 39, confederation: 'CAF', coachName: '埃默塞·法埃', coachNationality: '科特迪瓦', formation: '4-3-3', worldCupAppearances: 3, bestResult: '小组赛 (2006, 2010, 2014)', primaryColor: '#F77F00', secondaryColor: '#009E60' },
  { id: 'ECU', name: 'Ecuador', nameZh: '厄瓜多尔', code: 'ECU', logoUrl: '/flags/ec.png', groupName: 'Group E', fifaRank: 30, confederation: 'CONMEBOL', coachName: '塞巴斯蒂安·贝卡塞塞', coachNationality: '阿根廷', formation: '4-4-2', worldCupAppearances: 4, bestResult: '十六强 (2006)', primaryColor: '#FFD100', secondaryColor: '#0033A0' },
  // F组
  { id: 'NED', name: 'Netherlands', nameZh: '荷兰', code: 'NED', logoUrl: '/flags/nl.png', groupName: 'Group F', fifaRank: 7, confederation: 'UEFA', coachName: '罗纳德·科曼', coachNationality: '荷兰', formation: '3-4-3', worldCupAppearances: 11, bestResult: '亚军 (1974, 1978, 2010)', heroPlayerNames: ['范戴克', '德容', '西蒙斯'], primaryColor: '#FF6600', secondaryColor: '#FFFFFF' },
  { id: 'JPN', name: 'Japan', nameZh: '日本', code: 'JPN', logoUrl: '/flags/jp.png', groupName: 'Group F', fifaRank: 18, confederation: 'AFC', coachName: '森保一', coachNationality: '日本', formation: '4-2-3-1', worldCupAppearances: 7, bestResult: '十六强 (2002, 2010, 2018, 2022)', primaryColor: '#000080', secondaryColor: '#FFFFFF' },
  { id: 'SWE', name: 'Sweden', nameZh: '瑞典', code: 'SWE', logoUrl: '/flags/se.png', groupName: 'Group F', fifaRank: 26, confederation: 'UEFA', coachName: '容·达尔·托马森', coachNationality: '丹麦', formation: '4-4-2', worldCupAppearances: 12, bestResult: '亚军 (1958)', primaryColor: '#006AA7', secondaryColor: '#FECC02' },
  { id: 'TUN', name: 'Tunisia', nameZh: '突尼斯', code: 'TUN', logoUrl: '/flags/tn.png', groupName: 'Group F', fifaRank: 35, confederation: 'CAF', coachName: '法乌齐·库阿西', coachNationality: '突尼斯', formation: '4-3-3', worldCupAppearances: 6, bestResult: '小组赛 (多次)', primaryColor: '#D70000', secondaryColor: '#FFFFFF' },
  // G组
  { id: 'BEL', name: 'Belgium', nameZh: '比利时', code: 'BEL', logoUrl: '/flags/be.png', groupName: 'Group G', fifaRank: 6, confederation: 'UEFA', coachName: '罗伯托·马丁内斯', coachNationality: '西班牙', formation: '3-4-3', worldCupAppearances: 14, bestResult: '季军 (2018)', heroPlayerNames: ['德布劳内', '卢卡库', '多库'], primaryColor: '#ED2939', secondaryColor: '#000000' },
  { id: 'EGY', name: 'Egypt', nameZh: '埃及', code: 'EGY', logoUrl: '/flags/eg.png', groupName: 'Group G', fifaRank: 33, confederation: 'CAF', coachName: '鲁伊·维多利亚', coachNationality: '葡萄牙', formation: '4-2-3-1', worldCupAppearances: 3, bestResult: '小组赛 (1990, 2018)', primaryColor: '#CE1126', secondaryColor: '#FFFFFF' },
  { id: 'IRN', name: 'Iran', nameZh: '伊朗', code: 'IRN', logoUrl: '/flags/ir.png', groupName: 'Group G', fifaRank: 20, confederation: 'AFC', coachName: '阿米尔·加莱诺伊', coachNationality: '伊朗', formation: '4-3-3', worldCupAppearances: 6, bestResult: '小组赛 (多次)', primaryColor: '#239F40', secondaryColor: '#FFFFFF' },
  { id: 'NZL', name: 'New Zealand', nameZh: '新西兰', code: 'NZL', logoUrl: '/flags/nz.png', groupName: 'Group G', fifaRank: 90, confederation: 'OFC', coachName: '丹尼·海', coachNationality: '新西兰', formation: '4-4-2', worldCupAppearances: 2, bestResult: '小组赛 (1982, 2010)', primaryColor: '#000000', secondaryColor: '#FFFFFF' },
  // H组
  { id: 'ESP', name: 'Spain', nameZh: '西班牙', code: 'ESP', logoUrl: '/flags/es.png', groupName: 'Group H', fifaRank: 1, confederation: 'UEFA', coachName: '路易斯·德拉富恩特', coachNationality: '西班牙', formation: '4-3-3', worldCupAppearances: 17, bestResult: '冠军 (2010)', heroPlayerNames: ['亚马尔', '罗德里', '佩德里'], primaryColor: '#AA151B', secondaryColor: '#F1BF00' },
  { id: 'CPV', name: 'Cape Verde', nameZh: '佛得角', code: 'CPV', logoUrl: '/flags/cv.png', groupName: 'Group H', fifaRank: 65, confederation: 'CAF', coachName: '布巴卡尔·科斯塔', coachNationality: '佛得角', formation: '4-3-3', worldCupAppearances: 0, bestResult: '首次参赛', primaryColor: '#003893', secondaryColor: '#FFFFFF' },
  { id: 'KSA', name: 'Saudi Arabia', nameZh: '沙特阿拉伯', code: 'KSA', logoUrl: '/flags/sa.png', groupName: 'Group H', fifaRank: 54, confederation: 'AFC', coachName: '埃尔韦·勒纳尔', coachNationality: '法国', formation: '4-2-3-1', worldCupAppearances: 6, bestResult: '十六强 (1994)', primaryColor: '#006C35', secondaryColor: '#FFFFFF' },
  { id: 'URU', name: 'Uruguay', nameZh: '乌拉圭', code: 'URU', logoUrl: '/flags/uy.png', groupName: 'Group H', fifaRank: 11, confederation: 'CONMEBOL', coachName: '马塞洛·贝尔萨', coachNationality: '阿根廷', formation: '4-3-3', worldCupAppearances: 14, bestResult: '冠军 (1930, 1950)', primaryColor: '#5CBEFF', secondaryColor: '#FFFFFF' },
  // I组
  { id: 'FRA', name: 'France', nameZh: '法国', code: 'FRA', logoUrl: '/flags/fr.png', groupName: 'Group I', fifaRank: 2, confederation: 'UEFA', coachName: '迪迪埃·德尚', coachNationality: '法国', formation: '4-2-3-1', worldCupAppearances: 16, bestResult: '冠军 (1998, 2018)', heroPlayerNames: ['姆巴佩', '格列兹曼', '琼阿梅尼'], primaryColor: '#002395', secondaryColor: '#ED2939' },
  { id: 'SEN', name: 'Senegal', nameZh: '塞内加尔', code: 'SEN', logoUrl: '/flags/sn.png', groupName: 'Group I', fifaRank: 17, confederation: 'CAF', coachName: '阿利乌·西塞', coachNationality: '塞内加尔', formation: '4-2-3-1', worldCupAppearances: 3, bestResult: '八强 (2002)', primaryColor: '#00853F', secondaryColor: '#FFD100' },
  { id: 'IRQ', name: 'Iraq', nameZh: '伊拉克', code: 'IRQ', logoUrl: '/flags/iq.png', groupName: 'Group I', fifaRank: 55, confederation: 'AFC', coachName: '赫苏斯·卡萨斯', coachNationality: '西班牙', formation: '4-3-3', worldCupAppearances: 1, bestResult: '小组赛 (1986)', primaryColor: '#CE1126', secondaryColor: '#000000' },
  { id: 'NOR', name: 'Norway', nameZh: '挪威', code: 'NOR', logoUrl: '/flags/no.png', groupName: 'Group I', fifaRank: 40, confederation: 'UEFA', coachName: '斯托尔·索尔巴肯', coachNationality: '挪威', formation: '4-4-2', worldCupAppearances: 3, bestResult: '十六强 (1998)', primaryColor: '#BA0C2F', secondaryColor: '#00205B' },
  // J组
  { id: 'ARG', name: 'Argentina', nameZh: '阿根廷', code: 'ARG', logoUrl: '/flags/ar.png', groupName: 'Group J', fifaRank: 1, confederation: 'CONMEBOL', coachName: '利昂内尔·斯卡洛尼', coachNationality: '阿根廷', formation: '4-3-3', worldCupAppearances: 18, bestResult: '冠军 (1978, 1986, 2022)', heroPlayerNames: ['梅西', '劳塔罗', '阿尔瓦雷斯'], primaryColor: '#75AADB', secondaryColor: '#FFFFFF' },
  { id: 'DZA', name: 'Algeria', nameZh: '阿尔及利亚', code: 'DZA', logoUrl: '/flags/dz.png', groupName: 'Group J', fifaRank: 41, confederation: 'CAF', coachName: '弗拉迪米尔·佩特科维奇', coachNationality: '波黑', formation: '4-2-3-1', worldCupAppearances: 4, bestResult: '十六强 (2014)', primaryColor: '#006233', secondaryColor: '#D21034' },
  { id: 'AUT', name: 'Austria', nameZh: '奥地利', code: 'AUT', logoUrl: '/flags/at.png', groupName: 'Group J', fifaRank: 22, confederation: 'UEFA', coachName: '拉尔夫·朗尼克', coachNationality: '德国', formation: '4-2-2-2', worldCupAppearances: 7, bestResult: '季军 (1954)', primaryColor: '#ED2939', secondaryColor: '#FFFFFF' },
  { id: 'JOR', name: 'Jordan', nameZh: '约旦', code: 'JOR', logoUrl: '/flags/jo.png', groupName: 'Group J', fifaRank: 67, confederation: 'AFC', coachName: '阿莫塔', coachNationality: '摩洛哥', formation: '4-4-2', worldCupAppearances: 0, bestResult: '首次参赛', primaryColor: '#000000', secondaryColor: '#FFFFFF' },
  // K组
  { id: 'POR', name: 'Portugal', nameZh: '葡萄牙', code: 'POR', logoUrl: '/flags/pt.png', groupName: 'Group K', fifaRank: 6, confederation: 'UEFA', coachName: '罗伯托·马丁内斯', coachNationality: '西班牙', formation: '4-3-3', worldCupAppearances: 8, bestResult: '季军 (1966)', heroPlayerNames: ['C罗', 'B·席尔瓦', '莱奥'], primaryColor: '#006600', secondaryColor: '#FF0000' },
  { id: 'COD', name: 'DR Congo', nameZh: '刚果民主共和国', code: 'COD', logoUrl: '/flags/cd.png', groupName: 'Group K', fifaRank: 60, confederation: 'CAF', coachName: '塞巴斯蒂安·德萨布雷', coachNationality: '法国', formation: '4-3-3', worldCupAppearances: 1, bestResult: '小组赛 (1974)', primaryColor: '#007FFF', secondaryColor: '#F7D618' },
  { id: 'UZB', name: 'Uzbekistan', nameZh: '乌兹别克斯坦', code: 'UZB', logoUrl: '/flags/uz.png', groupName: 'Group K', fifaRank: 48, confederation: 'AFC', coachName: '斯雷奇科·卡塔内茨', coachNationality: '斯洛文尼亚', formation: '4-2-3-1', worldCupAppearances: 0, bestResult: '首次参赛', primaryColor: '#1EB53A', secondaryColor: '#0099B5' },
  { id: 'COL', name: 'Colombia', nameZh: '哥伦比亚', code: 'COL', logoUrl: '/flags/co.png', groupName: 'Group K', fifaRank: 12, confederation: 'CONMEBOL', coachName: '内斯托尔·洛伦索', coachNationality: '阿根廷', formation: '4-3-3', worldCupAppearances: 6, bestResult: '八强 (2014)', primaryColor: '#FCD116', secondaryColor: '#003893' },
  // L组
  { id: 'ENG', name: 'England', nameZh: '英格兰', code: 'ENG', logoUrl: '/flags/gb-eng.png', groupName: 'Group L', fifaRank: 4, confederation: 'UEFA', coachName: '托马斯·图赫尔', coachNationality: '德国', formation: '4-2-3-1', worldCupAppearances: 16, bestResult: '冠军 (1966)', heroPlayerNames: ['凯恩', '贝林厄姆', '萨卡'], primaryColor: '#FFFFFF', secondaryColor: '#CF081F' },
  { id: 'CRO', name: 'Croatia', nameZh: '克罗地亚', code: 'CRO', logoUrl: '/flags/hr.png', groupName: 'Group L', fifaRank: 10, confederation: 'UEFA', coachName: '兹拉特科·达利奇', coachNationality: '克罗地亚', formation: '4-3-3', worldCupAppearances: 6, bestResult: '亚军 (2018)', heroPlayerNames: ['莫德里奇', '格瓦迪奥尔'], primaryColor: '#FF0000', secondaryColor: '#171796' },
  { id: 'GHA', name: 'Ghana', nameZh: '加纳', code: 'GHA', logoUrl: '/flags/gh.png', groupName: 'Group L', fifaRank: 36, confederation: 'CAF', coachName: '奥托·阿多', coachNationality: '加纳', formation: '4-2-3-1', worldCupAppearances: 4, bestResult: '八强 (2010)', primaryColor: '#006B3F', secondaryColor: '#FCD116' },
  { id: 'PAN', name: 'Panama', nameZh: '巴拿马', code: 'PAN', logoUrl: '/flags/pa.png', groupName: 'Group L', fifaRank: 73, confederation: 'CONCACAF', coachName: '托马斯·克里斯蒂安森', coachNationality: '丹麦', formation: '4-4-2', worldCupAppearances: 1, bestResult: '小组赛 (2018)', primaryColor: '#005293', secondaryColor: '#FFFFFF' },
  // 特殊：待定球队
  { id: 'TBD', name: 'TBD', nameZh: '待定', code: 'TBD', logoUrl: '', groupName: '' },
  // 其他已有球队（保留兼容）
  { id: 'KOR', name: 'South Korea', nameZh: '韩国', code: 'KOR', logoUrl: '/flags/kr.png', groupName: 'Group B', fifaRank: 23, confederation: 'AFC', coachName: '洪明甫', coachNationality: '韩国', formation: '4-4-2', worldCupAppearances: 11, bestResult: '殿军 (2002)', primaryColor: '#003478', secondaryColor: '#CD2E3A' },
  { id: 'ITA', name: 'Italy', nameZh: '意大利', code: 'ITA', logoUrl: '/flags/it.png', groupName: 'Group G', fifaRank: 8, confederation: 'UEFA', coachName: '卢西亚诺·斯帕莱蒂', coachNationality: '意大利', formation: '4-3-3', worldCupAppearances: 18, bestResult: '冠军 (1934, 1938, 1982, 2006)', primaryColor: '#008C45', secondaryColor: '#CD212A' },
];

export const PRESEEDED_USERS = [
  { id: 'u1', groupId: 'room-1', displayName: '小李(明灯)', avatarUrl: '🤵', loginCode: 'WC1001', pinHash: '1234', balance: 10000 },
  { id: 'u2', groupId: 'room-1', displayName: '豪哥(冷门收割机)', avatarUrl: '⚽', loginCode: 'WC1002', pinHash: '1111', balance: 10000 },
  { id: 'u3', groupId: 'room-1', displayName: '阿强(常胜将军)', avatarUrl: '👑', loginCode: 'WC1003', pinHash: '8888', balance: 10000 },
  { id: 'u4', groupId: 'room-1', displayName: '小白(划水王)', avatarUrl: '🦁', loginCode: 'WC1004', pinHash: '0000', balance: 10000 },
  { id: 'u5', groupId: 'room-2', displayName: '老王粉丝', avatarUrl: '🥊', loginCode: 'WC2001', pinHash: '1234', balance: 10000 }
];

// 北京时间 → UTC
function bjToUtc(month: number, day: number, hour: number, minute: number) {
  const d = new Date(Date.UTC(2026, month - 1, day, hour - 8, minute, 0));
  return d.toISOString();
}

function bjTimeString(month: number, day: number, hour: number, minute: number) {
  return `2026/${month}/${day} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

let _matchId = 1;
function nextMatchId() { return `m-${_matchId++}`; }

function makeMatch(month: number, day: number, timeStr: string, stage: Match['stage'], roundName: string, homeId: string, awayId: string, venue: string): Match {
  const [h, m] = timeStr.split(':').map(Number);
  const utcTime = bjToUtc(month, day, h, m);
  const bjTime = bjTimeString(month, day, h, m);
  const autoLockAt = new Date(new Date(utcTime).getTime() - 5 * 60 * 1000).toISOString();
  return {
    id: nextMatchId(),
    homeTeamId: homeId,
    awayTeamId: awayId,
    stage,
    roundName,
    venueName: venue,
    venueCity: '',
    startTimeUtc: utcTime,
    startTimeBeijing: bjTime,
    status: MatchStatus.NS,
    isOddsFrozen: false,
    isPredictionLocked: false,
    isSettled: false,
    autoLockAt,
    operationalStatus: 'BETTABLE',
    settlementStatus: 'PENDING',
  };
}

export const SEED_MATCHES: Match[] = [
  // ── 6月12日 周五 ──
  makeMatch(6, 12, '03:00', 'Group Stage', 'A组第1轮', 'MEX', 'RSA', '阿兹特克体育场'),
  makeMatch(6, 12, '10:00', 'Group Stage', 'A组第1轮', 'KOR', 'CZE', '首尔世界杯体育场'),
  // ── 6月13日 周六 ──
  makeMatch(6, 13, '03:00', 'Group Stage', 'B组第1轮', 'CAN', 'BIH', 'BMO球场'),
  makeMatch(6, 13, '09:00', 'Group Stage', 'D组第1轮', 'USA', 'PAR', 'SoFi体育场'),
  // ── 6月14日 周日 ──
  makeMatch(6, 14, '03:00', 'Group Stage', 'B组第1轮', 'QAT', 'SUI', 'Lumen Field'),
  makeMatch(6, 14, '06:00', 'Group Stage', 'C组第1轮', 'BRA', 'MAR', 'MetLife体育场'),
  makeMatch(6, 14, '09:00', 'Group Stage', 'C组第1轮', 'HAI', 'SCO', 'Gillette体育场'),
  makeMatch(6, 14, '12:00', 'Group Stage', 'D组第1轮', 'AUS', 'TUR', 'AT&T体育场'),
  // ── 6月15日 周一 ──
  makeMatch(6, 15, '01:00', 'Group Stage', 'E组第1轮', 'GER', 'CUR', 'Mercedes-Benz体育场'),
  makeMatch(6, 15, '04:00', 'Group Stage', 'F组第1轮', 'NED', 'JPN', 'NRG体育场'),
  makeMatch(6, 15, '07:00', 'Group Stage', 'E组第1轮', 'CIV', 'ECU', 'Lincoln Financial Field'),
  makeMatch(6, 15, '10:00', 'Group Stage', 'F组第1轮', 'SWE', 'TUN', 'Lumen Field'),
  // ── 6月16日 周二 ──
  makeMatch(6, 16, '00:00', 'Group Stage', 'H组第1轮', 'ESP', 'CPV', '硬石体育场'),
  makeMatch(6, 16, '03:00', 'Group Stage', 'G组第1轮', 'BEL', 'EGY', '箭头体育场'),
  makeMatch(6, 16, '06:00', 'Group Stage', 'H组第1轮', 'KSA', 'URU', "Levi's体育场"),
  makeMatch(6, 16, '09:00', 'Group Stage', 'G组第1轮', 'IRN', 'NZL', 'Nippert体育场'),
  // ── 6月17日 周三 ──
  makeMatch(6, 17, '03:00', 'Group Stage', 'I组第1轮', 'FRA', 'SEN', 'SoFi体育场'),
  makeMatch(6, 17, '06:00', 'Group Stage', 'I组第1轮', 'IRQ', 'NOR', 'BMO球场'),
  makeMatch(6, 17, '09:00', 'Group Stage', 'J组第1轮', 'ARG', 'DZA', 'MetLife体育场'),
  makeMatch(6, 17, '12:00', 'Group Stage', 'J组第1轮', 'AUT', 'JOR', 'AT&T体育场'),
  // ── 6月18日 周四 ──
  makeMatch(6, 18, '01:00', 'Group Stage', 'K组第1轮', 'POR', 'COD', '硬石体育场'),
  makeMatch(6, 18, '04:00', 'Group Stage', 'L组第1轮', 'ENG', 'CRO', 'Wembley体育场'),
  makeMatch(6, 18, '07:00', 'Group Stage', 'L组第1轮', 'GHA', 'PAN', 'NRG体育场'),
  makeMatch(6, 18, '10:00', 'Group Stage', 'K组第1轮', 'UZB', 'COL', '箭头体育场'),
  // ── 6月19日 周五 ──
  makeMatch(6, 19, '00:00', 'Group Stage', 'A组第2轮', 'CZE', 'RSA', '首尔世界杯体育场'),
  makeMatch(6, 19, '03:00', 'Group Stage', 'B组第2轮', 'SUI', 'BIH', 'Lumen Field'),
  makeMatch(6, 19, '06:00', 'Group Stage', 'B组第2轮', 'CAN', 'QAT', 'BMO球场'),
  makeMatch(6, 19, '09:00', 'Group Stage', 'A组第2轮', 'MEX', 'KOR', '阿兹特克体育场'),
  // ── 6月20日 周六 ──
  makeMatch(6, 20, '03:00', 'Group Stage', 'D组第2轮', 'USA', 'AUS', 'SoFi体育场'),
  makeMatch(6, 20, '06:00', 'Group Stage', 'C组第2轮', 'SCO', 'MAR', 'Gillette体育场'),
  makeMatch(6, 20, '08:30', 'Group Stage', 'C组第2轮', 'BRA', 'HAI', 'MetLife体育场'),
  makeMatch(6, 20, '11:00', 'Group Stage', 'D组第2轮', 'TUR', 'PAR', 'AT&T体育场'),
  // ── 6月21日 周日 ──
  makeMatch(6, 21, '01:00', 'Group Stage', 'F组第2轮', 'NED', 'SWE', 'NRG体育场'),
  makeMatch(6, 21, '04:00', 'Group Stage', 'E组第2轮', 'GER', 'CIV', 'Mercedes-Benz体育场'),
  makeMatch(6, 21, '08:00', 'Group Stage', 'E组第2轮', 'ECU', 'CUR', 'Lincoln Financial Field'),
  makeMatch(6, 21, '12:00', 'Group Stage', 'F组第2轮', 'TUN', 'JPN', 'Lumen Field'),
  // ── 6月22日 周一 ──
  makeMatch(6, 22, '00:00', 'Group Stage', 'H组第2轮', 'ESP', 'KSA', '硬石体育场'),
  makeMatch(6, 22, '03:00', 'Group Stage', 'G组第2轮', 'BEL', 'IRN', '箭头体育场'),
  makeMatch(6, 22, '06:00', 'Group Stage', 'H组第2轮', 'URU', 'CPV', "Levi's体育场"),
  makeMatch(6, 22, '09:00', 'Group Stage', 'G组第2轮', 'NZL', 'EGY', 'Nippert体育场'),
  // ── 6月23日 周二 ──
  makeMatch(6, 23, '01:00', 'Group Stage', 'J组第2轮', 'ARG', 'AUT', 'MetLife体育场'),
  makeMatch(6, 23, '05:00', 'Group Stage', 'I组第2轮', 'FRA', 'IRQ', 'SoFi体育场'),
  makeMatch(6, 23, '08:00', 'Group Stage', 'I组第2轮', 'NOR', 'SEN', 'BMO球场'),
  makeMatch(6, 23, '11:00', 'Group Stage', 'J组第2轮', 'JOR', 'DZA', 'AT&T体育场'),
  // ── 6月24日 周三 ──
  makeMatch(6, 24, '01:00', 'Group Stage', 'K组第2轮', 'POR', 'UZB', '硬石体育场'),
  makeMatch(6, 24, '04:00', 'Group Stage', 'L组第2轮', 'ENG', 'GHA', 'Wembley体育场'),
  makeMatch(6, 24, '07:00', 'Group Stage', 'L组第2轮', 'PAN', 'CRO', 'NRG体育场'),
  makeMatch(6, 24, '10:00', 'Group Stage', 'K组第2轮', 'COL', 'COD', '箭头体育场'),
  // ── 6月25日 周四 ──
  makeMatch(6, 25, '03:00', 'Group Stage', 'B组第3轮', 'SUI', 'CAN', 'Lumen Field'),
  makeMatch(6, 25, '03:00', 'Group Stage', 'B组第3轮', 'BIH', 'QAT', 'BMO球场'),
  makeMatch(6, 25, '06:00', 'Group Stage', 'C组第3轮', 'SCO', 'BRA', 'Gillette体育场'),
  makeMatch(6, 25, '06:00', 'Group Stage', 'C组第3轮', 'MAR', 'HAI', 'MetLife体育场'),
  makeMatch(6, 25, '09:00', 'Group Stage', 'A组第3轮', 'CZE', 'MEX', '首尔世界杯体育场'),
  makeMatch(6, 25, '09:00', 'Group Stage', 'A组第3轮', 'RSA', 'KOR', '阿兹特克体育场'),
  // ── 6月26日 周五 ──
  makeMatch(6, 26, '04:00', 'Group Stage', 'E组第3轮', 'ECU', 'GER', 'Lincoln Financial Field'),
  makeMatch(6, 26, '04:00', 'Group Stage', 'E组第3轮', 'CUR', 'CIV', 'Mercedes-Benz体育场'),
  makeMatch(6, 26, '07:00', 'Group Stage', 'F组第3轮', 'TUN', 'NED', 'Lumen Field'),
  makeMatch(6, 26, '07:00', 'Group Stage', 'F组第3轮', 'JPN', 'SWE', 'NRG体育场'),
  makeMatch(6, 26, '10:00', 'Group Stage', 'D组第3轮', 'TUR', 'USA', 'AT&T体育场'),
  makeMatch(6, 26, '10:00', 'Group Stage', 'D组第3轮', 'PAR', 'AUS', 'SoFi体育场'),
  // ── 6月27日 周六 ──
  makeMatch(6, 27, '03:00', 'Group Stage', 'I组第3轮', 'NOR', 'FRA', 'BMO球场'),
  makeMatch(6, 27, '03:00', 'Group Stage', 'I组第3轮', 'SEN', 'IRQ', 'SoFi体育场'),
  makeMatch(6, 27, '08:00', 'Group Stage', 'H组第3轮', 'URU', 'ESP', "Levi's体育场"),
  makeMatch(6, 27, '08:00', 'Group Stage', 'H组第3轮', 'CPV', 'KSA', '硬石体育场'),
  makeMatch(6, 27, '11:00', 'Group Stage', 'G组第3轮', 'NZL', 'BEL', 'Nippert体育场'),
  makeMatch(6, 27, '11:00', 'Group Stage', 'G组第3轮', 'EGY', 'IRN', '箭头体育场'),
  // ── 6月28日 周日 ──
  makeMatch(6, 28, '05:00', 'Group Stage', 'L组第3轮', 'PAN', 'ENG', 'NRG体育场'),
  makeMatch(6, 28, '05:00', 'Group Stage', 'L组第3轮', 'CRO', 'GHA', 'Wembley体育场'),
  makeMatch(6, 28, '07:30', 'Group Stage', 'K组第3轮', 'COL', 'POR', '箭头体育场'),
  makeMatch(6, 28, '07:30', 'Group Stage', 'K组第3轮', 'COD', 'UZB', '硬石体育场'),
  makeMatch(6, 28, '10:00', 'Group Stage', 'J组第3轮', 'JOR', 'ARG', 'AT&T体育场'),
  makeMatch(6, 28, '10:00', 'Group Stage', 'J组第3轮', 'DZA', 'AUT', 'MetLife体育场'),
  // ── 淘汰赛 ──
  makeMatch(6, 29, '03:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(6, 30, '01:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(6, 30, '04:30', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(6, 30, '09:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 1, '01:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 1, '05:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 1, '09:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 2, '00:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 2, '04:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 2, '08:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 3, '03:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 3, '07:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 3, '11:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 4, '02:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 4, '06:00', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 4, '09:30', 'Round of 32', '1/32决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 5, '01:00', 'Round of 16', '1/16决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 5, '05:00', 'Round of 16', '1/16决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 6, '04:00', 'Round of 16', '1/16决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 6, '08:00', 'Round of 16', '1/16决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 7, '03:00', 'Round of 16', '1/16决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 7, '08:00', 'Round of 16', '1/16决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 8, '00:00', 'Round of 16', '1/16决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 8, '04:00', 'Round of 16', '1/16决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 10, '04:00', 'Quarter-finals', '1/4决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 11, '03:00', 'Quarter-finals', '1/4决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 12, '05:00', 'Quarter-finals', '1/4决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 12, '09:00', 'Quarter-finals', '1/4决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 15, '03:00', 'Semi-finals', '半决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 16, '03:00', 'Semi-finals', '半决赛', 'TBD', 'TBD', ''),
  makeMatch(7, 19, '05:00', 'Third-place play-off', '季军赛', 'TBD', 'TBD', ''),
  makeMatch(7, 20, '03:00', 'Final', '决赛', 'TBD', 'TBD', 'MetLife体育场'),
];

// 为小组赛生成默认赔率
export const SEED_ODDS: Record<string, MatchOdds> = {};
for (const match of SEED_MATCHES) {
  if (match.homeTeamId !== 'TBD' && match.awayTeamId !== 'TBD') {
    SEED_ODDS[match.id] = generateDefaultOdds(match.id);
  }
}
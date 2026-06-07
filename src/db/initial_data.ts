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
  { id: 'MEX', name: 'Mexico', nameZh: '墨西哥', code: 'MEX', logoUrl: '/flags/mx.png', groupName: 'Group A' },
  { id: 'RSA', name: 'South Africa', nameZh: '南非', code: 'RSA', logoUrl: '/flags/za.png', groupName: 'Group A' },
  { id: 'CZE', name: 'Czech Republic', nameZh: '捷克', code: 'CZE', logoUrl: '/flags/cz.png', groupName: 'Group A' },
  { id: 'CMR', name: 'Cameroon', nameZh: '喀麦隆', code: 'CMR', logoUrl: '/flags/cm.png', groupName: 'Group A' },
  // B组
  { id: 'CAN', name: 'Canada', nameZh: '加拿大', code: 'CAN', logoUrl: '/flags/ca.png', groupName: 'Group B' },
  { id: 'BIH', name: 'Bosnia and Herzegovina', nameZh: '波黑', code: 'BIH', logoUrl: '/flags/ba.png', groupName: 'Group B' },
  { id: 'QAT', name: 'Qatar', nameZh: '卡塔尔', code: 'QAT', logoUrl: '/flags/qa.png', groupName: 'Group B' },
  { id: 'SUI', name: 'Switzerland', nameZh: '瑞士', code: 'SUI', logoUrl: '/flags/ch.png', groupName: 'Group B' },
  // C组
  { id: 'BRA', name: 'Brazil', nameZh: '巴西', code: 'BRA', logoUrl: '/flags/br.png', groupName: 'Group C' },
  { id: 'MAR', name: 'Morocco', nameZh: '摩洛哥', code: 'MAR', logoUrl: '/flags/ma.png', groupName: 'Group C' },
  { id: 'HAI', name: 'Haiti', nameZh: '海地', code: 'HAI', logoUrl: '/flags/ht.png', groupName: 'Group C' },
  { id: 'SCO', name: 'Scotland', nameZh: '苏格兰', code: 'SCO', logoUrl: '/flags/gb-sct.png', groupName: 'Group C' },
  // D组
  { id: 'USA', name: 'USA', nameZh: '美国', code: 'USA', logoUrl: '/flags/us.png', groupName: 'Group D' },
  { id: 'PAR', name: 'Paraguay', nameZh: '巴拉圭', code: 'PAR', logoUrl: '/flags/py.png', groupName: 'Group D' },
  { id: 'AUS', name: 'Australia', nameZh: '澳大利亚', code: 'AUS', logoUrl: '/flags/au.png', groupName: 'Group D' },
  { id: 'TUR', name: 'Turkey', nameZh: '土耳其', code: 'TUR', logoUrl: '/flags/tr.png', groupName: 'Group D' },
  // E组
  { id: 'GER', name: 'Germany', nameZh: '德国', code: 'GER', logoUrl: '/flags/de.png', groupName: 'Group E' },
  { id: 'CUR', name: 'Curaçao', nameZh: '库拉索', code: 'CUR', logoUrl: '/flags/cw.png', groupName: 'Group E' },
  { id: 'CIV', name: "Côte d'Ivoire", nameZh: '科特迪瓦', code: 'CIV', logoUrl: '/flags/ci.png', groupName: 'Group E' },
  { id: 'ECU', name: 'Ecuador', nameZh: '厄瓜多尔', code: 'ECU', logoUrl: '/flags/ec.png', groupName: 'Group E' },
  // F组
  { id: 'NED', name: 'Netherlands', nameZh: '荷兰', code: 'NED', logoUrl: '/flags/nl.png', groupName: 'Group F' },
  { id: 'JPN', name: 'Japan', nameZh: '日本', code: 'JPN', logoUrl: '/flags/jp.png', groupName: 'Group F' },
  { id: 'SWE', name: 'Sweden', nameZh: '瑞典', code: 'SWE', logoUrl: '/flags/se.png', groupName: 'Group F' },
  { id: 'TUN', name: 'Tunisia', nameZh: '突尼斯', code: 'TUN', logoUrl: '/flags/tn.png', groupName: 'Group F' },
  // G组
  { id: 'BEL', name: 'Belgium', nameZh: '比利时', code: 'BEL', logoUrl: '/flags/be.png', groupName: 'Group G' },
  { id: 'EGY', name: 'Egypt', nameZh: '埃及', code: 'EGY', logoUrl: '/flags/eg.png', groupName: 'Group G' },
  { id: 'IRN', name: 'Iran', nameZh: '伊朗', code: 'IRN', logoUrl: '/flags/ir.png', groupName: 'Group G' },
  { id: 'NZL', name: 'New Zealand', nameZh: '新西兰', code: 'NZL', logoUrl: '/flags/nz.png', groupName: 'Group G' },
  // H组
  { id: 'ESP', name: 'Spain', nameZh: '西班牙', code: 'ESP', logoUrl: '/flags/es.png', groupName: 'Group H' },
  { id: 'CPV', name: 'Cape Verde', nameZh: '佛得角', code: 'CPV', logoUrl: '/flags/cv.png', groupName: 'Group H' },
  { id: 'KSA', name: 'Saudi Arabia', nameZh: '沙特阿拉伯', code: 'KSA', logoUrl: '/flags/sa.png', groupName: 'Group H' },
  { id: 'URU', name: 'Uruguay', nameZh: '乌拉圭', code: 'URU', logoUrl: '/flags/uy.png', groupName: 'Group H' },
  // I组
  { id: 'FRA', name: 'France', nameZh: '法国', code: 'FRA', logoUrl: '/flags/fr.png', groupName: 'Group I' },
  { id: 'SEN', name: 'Senegal', nameZh: '塞内加尔', code: 'SEN', logoUrl: '/flags/sn.png', groupName: 'Group I' },
  { id: 'IRQ', name: 'Iraq', nameZh: '伊拉克', code: 'IRQ', logoUrl: '/flags/iq.png', groupName: 'Group I' },
  { id: 'NOR', name: 'Norway', nameZh: '挪威', code: 'NOR', logoUrl: '/flags/no.png', groupName: 'Group I' },
  // J组
  { id: 'ARG', name: 'Argentina', nameZh: '阿根廷', code: 'ARG', logoUrl: '/flags/ar.png', groupName: 'Group J' },
  { id: 'DZA', name: 'Algeria', nameZh: '阿尔及利亚', code: 'DZA', logoUrl: '/flags/dz.png', groupName: 'Group J' },
  { id: 'AUT', name: 'Austria', nameZh: '奥地利', code: 'AUT', logoUrl: '/flags/at.png', groupName: 'Group J' },
  { id: 'JOR', name: 'Jordan', nameZh: '约旦', code: 'JOR', logoUrl: '/flags/jo.png', groupName: 'Group J' },
  // K组
  { id: 'POR', name: 'Portugal', nameZh: '葡萄牙', code: 'POR', logoUrl: '/flags/pt.png', groupName: 'Group K' },
  { id: 'COD', name: 'DR Congo', nameZh: '刚果民主共和国', code: 'COD', logoUrl: '/flags/cd.png', groupName: 'Group K' },
  { id: 'UZB', name: 'Uzbekistan', nameZh: '乌兹别克斯坦', code: 'UZB', logoUrl: '/flags/uz.png', groupName: 'Group K' },
  { id: 'COL', name: 'Colombia', nameZh: '哥伦比亚', code: 'COL', logoUrl: '/flags/co.png', groupName: 'Group K' },
  // L组
  { id: 'ENG', name: 'England', nameZh: '英格兰', code: 'ENG', logoUrl: '/flags/gb-eng.png', groupName: 'Group L' },
  { id: 'CRO', name: 'Croatia', nameZh: '克罗地亚', code: 'CRO', logoUrl: '/flags/hr.png', groupName: 'Group L' },
  { id: 'GHA', name: 'Ghana', nameZh: '加纳', code: 'GHA', logoUrl: '/flags/gh.png', groupName: 'Group L' },
  { id: 'PAN', name: 'Panama', nameZh: '巴拿马', code: 'PAN', logoUrl: '/flags/pa.png', groupName: 'Group L' },
  // 特殊：待定球队
  { id: 'TBD', name: 'TBD', nameZh: '待定', code: 'TBD', logoUrl: '', groupName: '' },
  // 其他已有球队（保留兼容）
  { id: 'KOR', name: 'South Korea', nameZh: '韩国', code: 'KOR', logoUrl: '/flags/kr.png', groupName: 'Group B' },
  { id: 'ITA', name: 'Italy', nameZh: '意大利', code: 'ITA', logoUrl: '/flags/it.png', groupName: 'Group G' },
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
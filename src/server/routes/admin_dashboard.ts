/**
 * 管理员数据仪表盘 API
 * 提供平台运营数据、用户增长、投注统计等
 */
import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import { requireAdmin } from '../helpers';

const router = Router();

router.get('/api/admin/dashboard/enhanced', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const db = dbService.getData();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const todayStart = new Date(now - (now % oneDay)).toISOString();
  const weekAgo = new Date(now - 7 * oneDay).toISOString();
  const monthAgo = new Date(now - 30 * oneDay).toISOString();

  // 用户统计
  const totalUsers = db.users.length;
  const claimedUsers = db.users.filter(u => u.status === 'CLAIMED').length;
  const unclaimedUsers = totalUsers - claimedUsers;
  const newUsersThisWeek = db.users.filter(u => u.createdAt >= weekAgo).length;
  const newUsersThisMonth = db.users.filter(u => u.createdAt >= monthAgo).length;
  const activeUsers = new Set(
    db.predictions.filter(p => p.placedAt >= todayStart).map(p => p.userId)
  ).size;

  // 投注统计
  const totalPredictions = db.predictions.length;
  const todayPredictions = db.predictions.filter(p => p.placedAt >= todayStart);
  const weekPredictions = db.predictions.filter(p => p.placedAt >= weekAgo);
  const todayBetVolume = todayPredictions.reduce((sum, p) => sum + p.stakePoints, 0);
  const weekBetVolume = weekPredictions.reduce((sum, p) => sum + p.stakePoints, 0);
  const totalBetVolume = db.predictions.reduce((sum, p) => sum + p.stakePoints, 0);

  // 结算统计
  const settledPredictions = db.predictions.filter(p => p.status === 'WON' || p.status === 'LOST');
  const wonCount = db.predictions.filter(p => p.status === 'WON').length;
  const lostCount = db.predictions.filter(p => p.status === 'LOST').length;
  const totalPayout = db.predictions.filter(p => p.status === 'WON').reduce((sum, p) => sum + (p.settledReturn || 0), 0);
  const platformProfit = totalBetVolume - totalPayout; // 平台盈亏（负值=平台亏损）

  // 比赛统计
  const totalMatches = db.matches.length;
  const settledMatches = db.matches.filter(m => m.isSettled).length;
  const liveMatches = db.matches.filter(m => m.status === 'LIVE' || m.status === 'HT').length;
  const upcomingMatches = db.matches.filter(m => !m.isSettled && new Date(m.startTimeUtc).getTime() > now).length;

  // 市场分布
  const marketDist: Record<string, number> = {};
  for (const p of db.predictions) {
    marketDist[p.market] = (marketDist[p.market] || 0) + 1;
  }

  // 热门比赛 TOP10
  const matchBetMap = new Map<string, number>();
  for (const p of db.predictions) {
    matchBetMap.set(p.matchId, (matchBetMap.get(p.matchId) || 0) + p.stakePoints);
  }
  const topMatches = [...matchBetMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([matchId, volume]) => {
      const match = db.matches.find(m => m.id === matchId);
      return {
        matchId,
        label: match ? `${match.homeTeam?.nameZh || '未知'} vs ${match.awayTeam?.nameZh || '未知'}` : matchId,
        volume,
        status: match?.status,
        isSettled: match?.isSettled,
      };
    });

  // 24 小时投注趋势
  const hourlyTrend = Array.from({ length: 24 }, (_, i) => {
    const hourStart = new Date(now - (23 - i) * 60 * 60 * 1000);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
    const hourPreds = db.predictions.filter(p => {
      const t = new Date(p.placedAt).getTime();
      return t >= hourStart.getTime() && t < hourEnd.getTime();
    });
    return {
      hour: `${hourStart.getHours().toString().padStart(2, '0')}:00`,
      count: hourPreds.length,
      volume: hourPreds.reduce((sum, p) => sum + p.stakePoints, 0),
    };
  });

  // 30 天用户增长趋势
  const dailyUserGrowth = Array.from({ length: 30 }, (_, i) => {
    const dayStart = new Date(now - (29 - i) * oneDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + oneDay);
    const count = db.users.filter(u => {
      const t = new Date(u.createdAt).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    }).length;
    return {
      date: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
      count,
    };
  });

  // 活跃用户 TOP10
  const userActivityMap = new Map<string, number>();
  for (const p of db.predictions) {
    userActivityMap.set(p.userId, (userActivityMap.get(p.userId) || 0) + 1);
  }
  const topActiveUsers = [...userActivityMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, count]) => {
      const user = db.users.find(u => u.id === userId);
      const wallet = db.wallets.find(w => w.userId === userId);
      return {
        userId,
        displayName: user?.displayName || '未知',
        avatarUrl: user?.avatarUrl,
        loginCode: user?.loginCode,
        betCount: count,
        balance: wallet?.balance || 0,
      };
    });

  // 投注选项分布
  const optionDist: Record<string, number> = {};
  for (const p of db.predictions) {
    optionDist[p.optionLabel] = (optionDist[p.optionLabel] || 0) + 1;
  }
  const topOptions = Object.entries(optionDist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, count]) => ({ label, count }));

  // 钱包总览
  const totalBalance = db.wallets.reduce((sum, w) => sum + w.balance, 0);
  const initialBalance = db.wallets.reduce((sum, w) => sum + (w.initialPoints || 0), 0);
  const avgBalance = totalUsers > 0 ? Math.round(totalBalance / totalUsers) : 0;

  res.json({
    overview: {
      totalUsers,
      claimedUsers,
      unclaimedUsers,
      activeUsers,
      newUsersThisWeek,
      newUsersThisMonth,
      totalMatches,
      settledMatches,
      liveMatches,
      upcomingMatches,
      totalPredictions,
      todayPredictions: todayPredictions.length,
      weekPredictions: weekPredictions.length,
      totalBetVolume,
      todayBetVolume,
      weekBetVolume,
      totalPayout,
      platformProfit,
      totalBalance,
      initialBalance,
      avgBalance,
    },
    marketDistribution: Object.entries(marketDist).map(([market, count]) => ({ market, count })),
    topMatches,
    hourlyTrend,
    dailyUserGrowth,
    topActiveUsers,
    topOptions,
    generatedAt: new Date().toISOString(),
  });
});

export default router;

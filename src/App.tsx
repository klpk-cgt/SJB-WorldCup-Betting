/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Award, BarChart3, Calendar, GitBranch, History, Home, Menu, Settings, Sparkles, Trophy, UserRound, X } from 'lucide-react';
import AdminPanel from './components/AdminPanel';
import BracketPage from './components/BracketPage';
import HistoryHallPage from './components/HistoryHallPage';
import HomeTab from './components/HomeTab';
import LeaderboardTab from './components/LeaderboardTab';
import MatchDetailPage from './components/MatchDetailPage';
import MatchesTab from './components/MatchesTab';
import MeTab from './components/MeTab';
import PredictionTab from './components/PredictionTab';
import StatsPage from './components/StatsPage';
import { ADMIN_KEY_STORAGE, apiRequest, ROOM_SLUG_STORAGE, USER_CODE_STORAGE } from './utils/api';
import type { User, Wallet } from './types';

type RootTab = 'home' | 'matches' | 'prediction' | 'leaderboard' | 'me' | 'admin';
type PageTab = RootTab | 'match-detail' | 'history-hall' | 'bracket' | 'stats';
type MatchDetailTab = 'overview' | 'lineup' | 'events' | 'stats';

const FOOTER_TABS: Array<{
  id: RootTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'home', label: '首页', icon: Sparkles },
  { id: 'matches', label: '赛程', icon: Calendar },
  { id: 'prediction', label: '竞猜', icon: Trophy },
  { id: 'leaderboard', label: '排行', icon: Award },
  { id: 'me', label: '我的', icon: UserRound },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<PageTab>('home');
  const [selectedMatchId, setSelectedMatchId] = useState<string | undefined>(undefined);
  const [selectedDetailTab, setSelectedDetailTab] = useState<MatchDetailTab>('overview');
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginCode, setLoginCode] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');

  const isAdmin = !!localStorage.getItem(ADMIN_KEY_STORAGE);

  const fetchUserProfileAndWallet = async () => {
    try {
      const resp = await apiRequest('/api/me');
      setUser(resp.user);
      setWallet(resp.wallet);
    } catch {
      setUser(null);
      setWallet(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfileAndWallet();
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');

    if (!loginCode.trim()) {
      setErrorMsg('请输入身份码。');
      return;
    }

    try {
      const resp = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          loginCode,
          pin: loginPin || undefined,
        }),
      });

      if (resp.success) {
        localStorage.setItem(USER_CODE_STORAGE, resp.user.loginCode);
        localStorage.setItem(ROOM_SLUG_STORAGE, resp.user.groupId);
        await fetchUserProfileAndWallet();
        setActiveTab('home');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '登录失败，请检查身份码和 PIN。');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(USER_CODE_STORAGE);
    localStorage.removeItem(ROOM_SLUG_STORAGE);
    setUser(null);
    setWallet(null);
    setActiveTab('home');
  };

  const handleAdminLogin = async () => {
    setAdminLoginError('');
    if (!adminUsername.trim() || !adminPassword.trim()) {
      setAdminLoginError('请输入管理员账号和密码。');
      return;
    }
    try {
      const resp = await apiRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });
      if (resp.success) {
        localStorage.setItem(ADMIN_KEY_STORAGE, resp.token);
        setShowAdminLogin(false);
        setAdminUsername('');
        setAdminPassword('');
        setActiveTab('admin');
      }
    } catch (err: any) {
      setAdminLoginError(err.message || '管理员账号或密码不正确。');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    setActiveTab('home');
  };

  const navigateTo = (targetTab: string, matchId?: string, detailTab?: string) => {
    if (targetTab === 'home') {
      setSelectedMatchId(undefined);
      setSelectedDetailTab('overview');
    } else if (matchId) {
      setSelectedMatchId(matchId);
    } else if (targetTab !== 'prediction') {
      setSelectedMatchId(undefined);
    }

    if (detailTab && ['overview', 'lineup', 'events', 'stats'].includes(detailTab)) {
      setSelectedDetailTab(detailTab as MatchDetailTab);
    } else if (targetTab === 'match-detail') {
      setSelectedDetailTab('overview');
    }

    setActiveTab(targetTab as PageTab);
    setNavDrawerOpen(false);
  };

  const goToRootTab = (target: RootTab) => {
    if (target !== 'prediction') {
      setSelectedMatchId(undefined);
    }
    if (target === 'home') {
      setSelectedDetailTab('overview');
    }
    setActiveTab(target);
  };

  const drawerItems = useMemo(
    () => [
      { id: 'home' as PageTab, label: '首页', desc: '回到焦点战和最近赛程', icon: <Home className="h-5 w-5" /> },
      { id: 'leaderboard' as PageTab, label: '排行榜', desc: '查看群聊实时排行', icon: <Award className="h-5 w-5" /> },
      { id: 'history-hall' as PageTab, label: '历史长廊', desc: '浏览历届世界杯经典内容', icon: <History className="h-5 w-5" /> },
      { id: 'bracket' as PageTab, label: '淘汰赛对阵图', desc: '查看晋级路径与实时比分', icon: <GitBranch className="h-5 w-5" /> },
      { id: 'stats' as PageTab, label: '统计页', desc: '查看群聊投注热度与分布', icon: <BarChart3 className="h-5 w-5" /> },
      ...(isAdmin
        ? [
            {
              id: 'admin' as PageTab,
              label: '管理后台',
              desc: '同步、赔率、用户和运营控制台',
              icon: <Settings className="h-5 w-5" />,
            },
          ]
        : []),
    ],
    [isAdmin],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100">
        <div className="w-72 space-y-4">
          <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-slate-200" />
          <div className="mx-auto h-4 w-40 animate-pulse rounded-lg bg-slate-200" />
          <div className="mx-auto h-3 w-32 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </div>
    );
  }

  if (activeTab === 'admin') {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-4xl">
          <AdminPanel onBackToApp={handleAdminLogout} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 sm:px-4">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col border-x border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] shadow-[0_0_50px_rgba(100,116,139,0.10)]">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 px-4 py-3.5 shadow-[0_2px_12px_rgba(148,163,184,0.04)] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-[14px] font-black leading-none text-slate-900">
                <span className="text-base">2026</span>
                <span>世界杯竞猜局</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-emerald-100">
                  Live
                </span>
              </h2>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                {user ? '群聊入口已登录，可直接查看赛程、竞猜和榜单。' : '当前为游客模式，可先浏览焦点战、赛程和历史内容。'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNavDrawerOpen(true)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              title="打开导航"
              aria-label="打开导航"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto px-4 py-4"
          style={{ paddingBottom: 'calc(7.25rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {activeTab === 'home' && (
            <HomeTab user={user} wallet={wallet} onRefreshWallet={fetchUserProfileAndWallet} onNavigate={navigateTo} />
          )}
          {activeTab === 'matches' && <MatchesTab onNavigate={navigateTo} selectedMatchId={selectedMatchId} isAdmin={isAdmin} />}
          {activeTab === 'match-detail' && (
            <MatchDetailPage
              matchId={selectedMatchId}
              defaultTab={selectedDetailTab}
              onBackToMatches={() => setActiveTab('matches')}
              onGoPrediction={(matchId) => navigateTo('prediction', matchId)}
            />
          )}
          {activeTab === 'prediction' && (
            <PredictionTab user={user} wallet={wallet} focusedMatchId={selectedMatchId} onRefreshWallet={fetchUserProfileAndWallet} />
          )}
          {activeTab === 'leaderboard' && <LeaderboardTab user={user} />}
          {activeTab === 'history-hall' && <HistoryHallPage />}
          {activeTab === 'bracket' && <BracketPage onOpenMatch={(matchId) => navigateTo('match-detail', matchId, 'overview')} />}
          {activeTab === 'stats' && <StatsPage />}
          {activeTab === 'me' &&
            (user ? (
              <MeTab user={user} wallet={wallet} onLogout={handleLogout} onAdminLogin={isAdmin ? undefined : () => setShowAdminLogin(true)} />
            ) : (
              <div className="space-y-6 pb-8 text-left">
                <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-tr from-slate-950 to-slate-800 p-6 shadow-2xl">
                  <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" />
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        观赛模式
                      </span>
                      <h1 className="mt-1.5 text-3xl font-black tracking-tight text-white">
                        0 <span className="text-xs font-bold text-gray-400">PTS</span>
                      </h1>
                      <p className="text-xs text-gray-400">登录后即可恢复你的积分资产和竞猜记录。</p>
                    </div>
                    <UserRound className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950 p-2.5 text-emerald-400" />
                  </div>
                </div>

                <div className="space-y-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_15px_40px_rgba(100,116,139,0.08)]">
                  <div className="space-y-1 border-b border-slate-100 pb-2 text-center">
                    <h2 className="text-sm font-black text-slate-800">身份码登录</h2>
                    <p className="text-[11px] font-medium text-slate-500">输入你的登录码即可进入（有 PIN 的账号需输入 PIN）。</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">登录码</label>
                      <input
                        type="text"
                        placeholder="例如：ZS（首字母）或 WC1001"
                        value={loginCode}
                        onChange={(e) => setLoginCode(e.target.value)}
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-800 focus:border-emerald-500/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">登录 PIN（可选）</label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="管理员分配的账号无需 PIN"
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value)}
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs text-slate-800 focus:border-emerald-500/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>

                    <button
                      type="submit"
                      className="mt-2 w-full rounded-xl bg-emerald-500 py-3.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-emerald-600 hover:shadow-emerald-500/20"
                    >
                      进入
                    </button>
                    <p className="text-center text-[9.5px] leading-relaxed text-slate-400">
                      当前版本不开放公开注册，没有登录码时，请联系群管理员分配。
                    </p>
                  </form>

                  {errorMsg && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600">{errorMsg}</div>}
                </div>
              </div>
            ))}
        </main>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-0 sm:px-4">
        <footer
          className="pointer-events-auto w-full max-w-md border-x border-t border-slate-200/80 bg-white/94 px-3.5 py-2 shadow-[0_-12px_30px_rgba(148,163,184,0.10)] backdrop-blur-lg"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="flex items-end justify-between">
            {FOOTER_TABS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              const isCenter = item.id === 'prediction';

              return (
                <div key={item.id} className={isCenter ? 'relative -top-4' : ''}>
                  <button
                    type="button"
                    onClick={() => goToRootTab(item.id)}
                    aria-label={item.label}
                    className={
                      isCenter
                        ? `z-50 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)] transition hover:scale-105 active:scale-95 ${
                            active ? 'scale-105 saturate-110' : ''
                          }`
                        : `flex flex-col items-center space-y-1 rounded-xl px-3 py-1 transition ${
                            active ? 'font-bold text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                          }`
                    }
                  >
                    <Icon className={isCenter ? 'h-5 w-5 shrink-0 text-white' : 'h-5 w-5'} />
                    {!isCenter && <span className="text-[10px] font-bold">{item.label}</span>}
                  </button>
                  {isCenter && <span className="mt-1 block text-center text-[10px] font-extrabold text-emerald-600">{item.label}</span>}
                </div>
              );
            })}
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {navDrawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNavDrawerOpen(false)}
            />

            <motion.div
              className="fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-white shadow-2xl"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-black text-slate-900">导航</h3>
                <button
                  type="button"
                  onClick={() => setNavDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="关闭导航"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4">
                {drawerItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition hover:bg-slate-50 active:bg-slate-100"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{item.icon}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.label}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </nav>

              <div className="border-t border-slate-100 px-5 py-3">
                <p className="text-[10px] text-slate-400">2026 世界杯竞猜局 · 导航中心</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 管理员登录弹窗 */}
      <AnimatePresence>
        {showAdminLogin && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAdminLogin(false); setAdminLoginError(''); }}
            />
            <motion.div
              className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h3 className="text-lg font-black text-slate-900">管理员登录</h3>
              <p className="mt-1 text-xs text-slate-500">输入管理员账号和密码以进入管理后台。</p>
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="管理员账号"
                  value={adminUsername}
                  onChange={(e) => { setAdminUsername(e.target.value); setAdminLoginError(''); }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-800 focus:border-emerald-500/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                />
                <input
                  type="password"
                  placeholder="管理员密码"
                  value={adminPassword}
                  onChange={(e) => { setAdminPassword(e.target.value); setAdminLoginError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdminLogin(); }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-800 focus:border-emerald-500/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              {adminLoginError && (
                <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600">{adminLoginError}</div>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => { setShowAdminLogin(false); setAdminLoginError(''); }}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                >
                  取消
                </button>
                <button
                  onClick={handleAdminLogin}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 text-xs font-black text-slate-950 shadow-md transition hover:bg-emerald-600"
                >
                  登录
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Calendar, Home, Settings, Sparkles, Trophy, UserRound } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import HomeTab from './components/HomeTab';
import MatchesTab from './components/MatchesTab';
import PredictionTab from './components/PredictionTab';
import LeaderboardTab from './components/LeaderboardTab';
import MeTab from './components/MeTab';
import AdminPanel from './components/AdminPanel';
import { ADMIN_KEY_STORAGE, apiRequest, ROOM_SLUG_STORAGE, USER_CODE_STORAGE } from './utils/api';

type TabType = 'home' | 'matches' | 'prediction' | 'leaderboard' | 'me' | 'admin';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedMatchId, setSelectedMatchId] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<any | null>(null);
  const [wallet, setWallet] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginCode, setLoginCode] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [footerVisible, setFooterVisible] = useState(true);
  const [selectedDetailTab, setSelectedDetailTab] = useState<'events' | 'lineup' | 'stats'>('events');
  const lastScrollY = useRef(0);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>();

  const isAdmin = !!localStorage.getItem(ADMIN_KEY_STORAGE);

  const handleMainScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentY = e.currentTarget.scrollTop;
    const delta = currentY - lastScrollY.current;
    lastScrollY.current = currentY;

    if (currentY < 24) {
      setFooterVisible(true);
    } else if (delta > 16 && currentY > 96) {
      setFooterVisible(false);
    } else if (delta < -10) {
      setFooterVisible(true);
    }

    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => setFooterVisible(true), 1800);
  }, []);

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

    if (!loginCode.trim() || !loginPin.trim()) {
      setErrorMsg('请输入身份码和 4 位 PIN。');
      return;
    }

    try {
      const resp = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          loginCode,
          pin: loginPin,
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

  const navigateTo = (targetTab: string, matchId?: string, detailTab?: string) => {
    setSelectedMatchId(matchId);
    setActiveTab(targetTab as TabType);
    if (detailTab) {
      setSelectedDetailTab(detailTab as 'events' | 'lineup' | 'stats');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-xs font-medium text-slate-500">正在加载世界杯前台...</p>
      </div>
    );
  }

  if (activeTab === 'admin') {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-4xl">
          <AdminPanel onBackToApp={() => setActiveTab('home')} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 sm:px-4">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden border-x border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] shadow-[0_0_50px_rgba(100,116,139,0.10)]">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 px-4 py-3.5 text-left shadow-[0_2px_12px_rgba(148,163,184,0.04)] backdrop-blur-md">
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
                {user ? '群聊观赛入口已登录，可直接查看赛程和竞猜。' : '当前为游客模式，可先浏览焦点战和赛程。'}
              </p>
            </div>
          </div>
          {/* 顶部导航栏 */}
          <div className="mt-2.5 flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {[
              { id: 'home', label: '首页', icon: <Home className="h-3 w-3" /> },
              { id: 'matches', label: '赛程', icon: <Calendar className="h-3 w-3" /> },
              { id: 'prediction', label: '竞猜', icon: <Trophy className="h-3 w-3" /> },
              { id: 'leaderboard', label: '排行', icon: <Award className="h-3 w-3" /> },
              { id: 'me', label: '我的', icon: <UserRound className="h-3 w-3" /> },
              ...(isAdmin ? [{ id: 'admin', label: '管理', icon: <Settings className="h-3 w-3" /> }] : []),
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as TabType);
                  setSelectedMatchId(undefined);
                }}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  activeTab === item.id
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto px-4 py-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          onScroll={handleMainScroll}
        >
          {activeTab === 'home' && (
            <HomeTab
              user={user}
              wallet={wallet}
              onRefreshWallet={fetchUserProfileAndWallet}
              onNavigate={navigateTo}
            />
          )}

          {activeTab === 'matches' && (
            <MatchesTab onNavigate={navigateTo} selectedMatchId={selectedMatchId} isAdmin={isAdmin} defaultDetailTab={selectedDetailTab} />
          )}

          {activeTab === 'prediction' && (
            <PredictionTab
              user={user}
              wallet={wallet}
              focusedMatchId={selectedMatchId}
              onRefreshWallet={fetchUserProfileAndWallet}
            />
          )}

          {activeTab === 'leaderboard' && <LeaderboardTab user={user} />}

          {activeTab === 'me' &&
            (user ? (
              <MeTab user={user} wallet={wallet} onLogout={handleLogout} />
            ) : (
              <div className="space-y-6 pb-20 text-left">
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
                    <p className="text-[11px] font-medium text-slate-500">请输入你的 WC 身份码和 4 位 PIN。</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        我的 WC 代码
                      </label>
                      <input
                        type="text"
                        placeholder="例如：WC1001"
                        value={loginCode}
                        onChange={(e) => setLoginCode(e.target.value)}
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-800 focus:border-emerald-500/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        4 位登录 PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="例如：1234"
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value)}
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs text-slate-800 focus:border-emerald-500/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>

                    <button
                      type="submit"
                      className="mt-2 w-full rounded-xl bg-emerald-500 py-3.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-emerald-600 hover:shadow-emerald-500/20"
                    >
                      验证并进入
                    </button>
                    <p className="text-center text-[9.5px] leading-relaxed text-slate-400">
                      当前版本不开放公开注册，没有自己的 WC 代码时，请联系群管理员分配。
                    </p>
                  </form>

                  {errorMsg && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600">{errorMsg}</div>}
                </div>
              </div>
            ))}
        </main>

        <AnimatePresence>
          {footerVisible && (
            <motion.footer
              initial={{ y: 0 }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="sticky bottom-0 z-40 flex items-center justify-between border-t border-slate-200/80 bg-white/92 px-3.5 py-2.5 shadow-[0_-8px_24px_rgba(148,163,184,0.06)] backdrop-blur-lg"
              style={{ paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                onClick={() => {
                  setActiveTab('home');
                  setSelectedMatchId(undefined);
                }}
                className={`flex cursor-pointer flex-col items-center space-y-1 rounded-xl px-3 py-1.5 transition ${
                  activeTab === 'home' ? 'font-bold text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-[10px] font-bold">首页</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('matches');
                  setSelectedMatchId(undefined);
                }}
                className={`flex cursor-pointer flex-col items-center space-y-1 rounded-xl px-3 py-1.5 transition ${
                  activeTab === 'matches' ? 'font-bold text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Calendar className="h-5 w-5" />
                <span className="text-[10px] font-bold">赛程</span>
              </button>

              <div className="relative -top-5">
                <button
                  type="button"
                  aria-label="去竞猜"
                  onClick={() => {
                    setActiveTab('prediction');
                    setSelectedMatchId(undefined);
                  }}
                  className={`z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)] transition hover:scale-105 active:scale-95 ${
                    activeTab === 'prediction' ? 'scale-105 saturate-110' : ''
                  }`}
                >
                  <Trophy className="h-6 w-6 shrink-0 text-white" />
                </button>
                <span className="mt-1 block text-center text-[10px] font-extrabold text-emerald-600">去竞猜</span>
              </div>

              <button
                onClick={() => {
                  setActiveTab('leaderboard');
                  setSelectedMatchId(undefined);
                }}
                className={`flex cursor-pointer flex-col items-center space-y-1 rounded-xl px-3 py-1.5 transition ${
                  activeTab === 'leaderboard' ? 'font-bold text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Award className="h-5 w-5" />
                <span className="text-[10px] font-bold">排行</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('me');
                  setSelectedMatchId(undefined);
                }}
                className={`flex cursor-pointer flex-col items-center space-y-1 rounded-xl px-3 py-1.5 transition ${
                  activeTab === 'me' ? 'font-bold text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <UserRound className="h-5 w-5" />
                <span className="text-[10px] font-bold">我的</span>
              </button>
            </motion.footer>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * 搜索组件
 * 支持按队名搜索比赛，点击结果进入比赛详情
 */
import { useState, useRef, useEffect } from 'react';
import { Search, X, Calendar, Clock } from 'lucide-react';
import { apiRequest } from '../utils/api';

interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamFlag?: string;
  awayTeamFlag?: string;
  startTimeUtc: string;
  status: string;
  isSettled: boolean;
  homeScore?: number;
  awayScore?: number;
}

interface SearchResult {
  total: number;
  matches: Match[];
}

interface SearchBarProps {
  onNavigate: (tab: string, matchId?: string) => void;
  compact?: boolean;
}

export default function SearchBar({ onNavigate, compact }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults(null);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await apiRequest(`/api/matches/search?q=${encodeURIComponent(value)}&limit=20`);
        setResults(resp);
        setOpen(true);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const formatTime = (utc: string) => {
    const d = new Date(utc);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getStatusText = (status: string, isSettled: boolean) => {
    if (isSettled) return '已完场';
    const statusMap: Record<string, string> = {
      NS: '未开始',
      LIVE: '进行中',
      HT: '中场',
      FT: '完场',
      ET: '加时',
      PEN: '点球',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string, isSettled: boolean) => {
    if (isSettled) return 'text-slate-400';
    if (status === 'LIVE' || status === 'HT') return 'text-red-500';
    return 'text-slate-400';
  };

  if (compact) {
    return (
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setFocused(true)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
        >
          <Search className="h-4 w-4" />
        </button>
        {focused && (
          <div className="absolute right-0 top-0 z-50 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <input
              type="text"
              placeholder="搜索比赛..."
              autoFocus
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition focus-within:border-emerald-500">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="搜索比赛、队伍..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults(null); setOpen(false); }}
            className="rounded-full p-0.5 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && results && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400">搜索中...</div>
          ) : results.matches.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">未找到相关比赛</div>
          ) : (
            <>
              <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold text-slate-400">
                找到 {results.total} 场比赛
              </div>
              {results.matches.map((match) => (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => {
                    onNavigate('match-detail', match.id);
                    setOpen(false);
                    setQuery('');
                    setResults(null);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 active:bg-slate-100"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{match.homeTeamName}</span>
                      {match.isSettled && match.homeScore !== undefined ? (
                        <span className="text-xs font-black text-slate-900">{match.homeScore}</span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{match.awayTeamName}</span>
                      {match.isSettled && match.awayScore !== undefined ? (
                        <span className="text-xs font-black text-slate-900">{match.awayScore}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${getStatusColor(match.status, match.isSettled)}`}>
                      {match.status === 'LIVE' ? <Clock className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                      {getStatusText(match.status, match.isSettled)}
                    </div>
                    {!match.isSettled && (
                      <div className="mt-0.5 text-[9px] text-slate-400">{formatTime(match.startTimeUtc)}</div>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

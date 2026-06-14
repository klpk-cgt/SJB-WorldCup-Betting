/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const ADMIN_KEY_STORAGE = 'wc_admin_token';
export const USER_CODE_STORAGE = 'wc_user_login_code';
export const ROOM_SLUG_STORAGE = 'wc_room_slug';

// ─── 请求缓存 + 去重 ───
const _cache = new Map<string, { data: unknown; ts: number }>();
const _pending = new Map<string, Promise<unknown>>();
const CACHE_TTL = 2 * 60 * 1000; // 2分钟缓存过期

function _cacheKey(path: string, method: string) {
  return method + '::' + path;
}

/** 清除所有缓存（登录/登出时调用） */
export function clearApiCache() {
  _cache.clear();
  _pending.clear();
}

export async function apiRequest(path: string, options: RequestInit = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const key = _cacheKey(path, method);

  // GET 请求走缓存+去重，写操作跳过
  if (method === 'GET') {
    // 1. 去重：相同 GET 请求复用同一个 Promise
    if (_pending.has(key)) return _pending.get(key);

    // 2. 缓存命中（2分钟内）
    const cached = _cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  }

  const loginCode = localStorage.getItem(USER_CODE_STORAGE) || '';
  const adminToken = localStorage.getItem(ADMIN_KEY_STORAGE) || '';

  const headers = new Headers(options.headers || {});
  if (loginCode) {
    headers.set('Authorization', loginCode);
  }
  if (adminToken) {
    headers.set('x-admin-token', adminToken);
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const doFetch = async () => {
    let response: Response;
    try {
      response = await fetch(path, { ...options, headers });
    } catch (err) {
      if (err instanceof TypeError) throw new Error('网络请求失败，请检查您的网络连接。');
      throw new Error('请求异常，请稍后再试。');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || errorData.message;
      if (message) throw new Error(message);
      if (response.status === 401) throw new Error('登录已失效，请重新登录。');
      if (response.status === 403) throw new Error('没有权限执行此操作。');
      if (response.status === 404) throw new Error('请求的资源不存在。');
      if (response.status === 429) throw new Error('操作过于频繁，请稍后再试。');
      if (response.status >= 500) throw new Error('服务器开小差了，请稍后再试或联系管理员。');
      throw new Error(`请求失败（${response.status}）`);
    }

    const data = await response.json();

    // 缓存 GET 结果
    if (method === 'GET') {
      _cache.set(key, { data, ts: Date.now() });
    }

    return data;
  };

  if (method === 'GET') {
    const promise = doFetch();
    _pending.set(key, promise);
    try {
      return await promise;
    } finally {
      _pending.delete(key);
    }
  }

  return doFetch();
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

export function formatAbsoluteDay(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  } catch {
    return isoString;
  }
}

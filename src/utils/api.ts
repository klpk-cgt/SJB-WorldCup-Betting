/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const ADMIN_KEY_STORAGE = 'wc_admin_token';
export const USER_CODE_STORAGE = 'wc_user_login_code';
export const ROOM_SLUG_STORAGE = 'wc_room_slug';

export async function apiRequest(path: string, options: RequestInit = {}) {
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

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
    });
  } catch (err) {
    // 网络层错误（断网、DNS 失败、CORS 等）
    if (err instanceof TypeError) {
      throw new Error('网络请求失败，请检查您的网络连接。');
    }
    throw new Error('请求异常，请稍后再试。');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || errorData.message;
    if (message) {
      throw new Error(message);
    }
    // 不同状态码给中文提示
    if (response.status === 401) {
      throw new Error('登录已失效，请重新登录。');
    }
    if (response.status === 403) {
      throw new Error('没有权限执行此操作。');
    }
    if (response.status === 404) {
      throw new Error('请求的资源不存在。');
    }
    if (response.status === 429) {
      throw new Error('操作过于频繁，请稍后再试。');
    }
    if (response.status >= 500) {
      throw new Error('服务器开小差了，请稍后再试或联系管理员。');
    }
    throw new Error(`请求失败（${response.status}）`);
  }

  return response.json();
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

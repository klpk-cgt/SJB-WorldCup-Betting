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

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `请求失败 (${response.status})`);
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

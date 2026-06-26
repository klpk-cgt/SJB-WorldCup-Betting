/**
 * 统一积分/货币格式化工具
 * 所有用户积分显示统一使用 ¥ 前缀 + 千分位格式
 */

/** 通用积分格式化：¥1,000 */
export function formatPoints(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '¥0';
  return '¥' + Math.round(value).toLocaleString();
}

/** 带符号积分格式化：+¥1,000 / -¥500 */
export function formatSignedPoints(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '¥0';
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : '';
  return sign + '¥' + Math.abs(rounded).toLocaleString();
}

/** 赔率格式化：2.20 或 -- */
export function formatOdds(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '--';
  return value.toFixed(2);
}

/** 预计回收格式化：¥1,200（整数） */
export function formatReturn(stake: number, odds: number): string {
  return formatPoints(stake * odds);
}

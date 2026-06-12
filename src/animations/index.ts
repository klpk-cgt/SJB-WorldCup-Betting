/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GSAP 动画工具集
 *
 * 提供统一的 stagger reveal、scroll reveal、reduced motion 支持。
 * 所有页面动画应通过这些 hooks 实现，保持一致性。
 */

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// 注册 GSAP 插件
gsap.registerPlugin(ScrollTrigger);

/**
 * 检测用户是否开启了 prefers-reduced-motion
 */
export function useReducedMotion(): boolean {
  const reducedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;

    const handler = (e: MediaQueryListEvent) => {
      reducedRef.current = e.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reducedRef.current;
}

/**
 * Stagger Reveal 动画
 *
 * 子元素依次淡入上移，适合卡片列表、赛程列表等。
 *
 * @example
 * const containerRef = useRef<HTMLDivElement>(null);
 * useStaggerReveal(containerRef, '.match-card');
 *
 * <div ref={containerRef}>
 *   <div className="match-card">...</div>
 *   <div className="match-card">...</div>
 * </div>
 */
export function useStaggerReveal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  selector: string,
  options?: {
    stagger?: number;
    duration?: number;
    y?: number;
    delay?: number;
  },
) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !containerRef.current) return;

    const items = containerRef.current.querySelectorAll(selector);
    if (items.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.from(items, {
        opacity: 0,
        y: options?.y ?? 20,
        duration: options?.duration ?? 0.4,
        stagger: options?.stagger ?? 0.08,
        delay: options?.delay ?? 0,
        ease: 'power2.out',
        clearProps: 'opacity,y',
      });
    }, containerRef);

    return () => ctx.revert();
  }, [containerRef, selector, reduced, options?.stagger, options?.duration, options?.y, options?.delay]);
}

/**
 * Scroll Reveal 动画
 *
 * 元素进入视口时淡入上移，适合统计页、排行榜等滚动页面。
 *
 * @example
 * const sectionRef = useRef<HTMLDivElement>(null);
 * useScrollReveal(sectionRef);
 *
 * <div ref={sectionRef}>...</div>
 */
export function useScrollReveal(
  elementRef: React.RefObject<HTMLDivElement | null>,
  options?: {
    duration?: number;
    y?: number;
    start?: string;
  },
) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !elementRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from(elementRef.current!, {
        opacity: 0,
        y: options?.y ?? 30,
        duration: options?.duration ?? 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: elementRef.current!,
          start: options?.start ?? 'top 85%',
          toggleActions: 'play none none none',
        },
        clearProps: 'opacity,y',
      });
    }, elementRef);

    return () => ctx.revert();
  }, [elementRef, reduced, options?.duration, options?.y, options?.start]);
}

/**
 * 简单的淡入动画
 *
 * 适合单个元素（如标题、按钮）的入场动画。
 */
export function useFadeIn(
  elementRef: React.RefObject<HTMLDivElement | null>,
  options?: {
    duration?: number;
    delay?: number;
    y?: number;
  },
) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !elementRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from(elementRef.current!, {
        opacity: 0,
        y: options?.y ?? 10,
        duration: options?.duration ?? 0.3,
        delay: options?.delay ?? 0,
        ease: 'power2.out',
        clearProps: 'opacity,y',
      });
    }, elementRef);

    return () => ctx.revert();
  }, [elementRef, reduced, options?.duration, options?.delay, options?.y]);
}

/**
 * React Error Boundary 错误边界
 * 捕获子组件渲染错误并展示友好降级页
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare state: ErrorBoundaryState;
  declare props: ErrorBoundaryProps & { children?: ReactNode };
  declare setState: (state: Partial<ErrorBoundaryState>) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 输出到控制台，同时调用自定义 onError
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-10 text-center text-slate-200">
          <div className="mb-4 text-6xl">⚽</div>
          <h1 className="mb-2 text-2xl font-black text-rose-400">页面出了点问题</h1>
          <p className="mb-6 max-w-md text-sm text-slate-400">
            {this.state.error?.message || '发生了未知错误，请尝试刷新页面。'}
            <br />
            如果问题持续出现，请联系管理员查看日志。
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="rounded-2xl bg-sky-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400"
            >
              重试
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-2xl bg-slate-700 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-600"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

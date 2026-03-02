'use client';

import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorMessage?: string;
  retryLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="p-6 text-center">
          <div className="size-12 rounded-full bg-red-500/15 border border-red-400/25 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="size-6 text-red-400" aria-hidden="true" />
          </div>
          <div className="text-sm text-red-300 text-pretty mb-3">{this.props.errorMessage ?? 'Something went wrong.'}</div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm font-semibold bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {this.props.retryLabel ?? 'Try again'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

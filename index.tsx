import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
              !
            </div>
            <h2 className="text-2xl font-black mb-2">เกิดข้อผิดพลาดในการโหลดระบบ</h2>
            <p className="text-slate-400 text-sm mb-6">
              {this.state.error?.message || "โปรดรีเฟรชหน้าเว็บเพื่อเข้าใช้งานอีกครั้ง"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              รีเฟรชหน้าเว็บ
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global Error Handler to catch boot errors
window.onerror = function(message, source, lineno, colno, error) {
  const rootElement = document.getElementById('root');
  if (rootElement && (!rootElement.innerHTML || rootElement.innerHTML.trim() === '')) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; margin: 20px; font-family: sans-serif;">
        <h2 style="margin-top: 0;">App Boot Error</h2>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Source:</strong> ${source}:${lineno}:${colno}</p>
        <pre style="white-space: pre-wrap; font-size: 12px; margin-top: 10px;">${error?.stack || ''}</pre>
        <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background-color: #721c24; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload</button>
      </div>
    `;
  }
  return false;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

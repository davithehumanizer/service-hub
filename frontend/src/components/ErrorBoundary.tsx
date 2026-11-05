import React from 'react';
import { persistor } from '../stores/globalStore';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

async function clearAllCaches(): Promise<void> {
  try {
    localStorage.clear();
    sessionStorage.clear();
    persistor.purge();
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (_) {
    // best-effort
  }
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      /Loading chunk \d+ failed/.test(error.message) ||
      /Failed to fetch dynamically imported module/.test(error.message);
    return { hasError: true, isChunkError };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);

    if (this.state.isChunkError) {
      clearAllCaches().then(() => window.location.reload());
    }
  }

  handleManualClear = async (): Promise<void> => {
    await clearAllCaches();
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.state.isChunkError) {
      // Auto-reload in progress, show nothing
      return null;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Une erreur est survenue
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            L&apos;application a rencontré un problème. 
          </p>
          <button
            onClick={this.handleManualClear}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

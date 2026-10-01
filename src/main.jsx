import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          background: '#060b14',
          color: '#edf4ff',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'Inter, Segoe UI, sans-serif'
        }}>
          <div>
            <h1>⚠️ Oops! Something went wrong</h1>
            <p style={{ color: '#a5b0c7', marginBottom: '20px' }}>
              Please refresh the page or check the browser console for details.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #ff7a18, #ff3b3b)',
                color: '#0a0f17',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Graceful service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch(err => {
        // Non-critical: service worker is optional
        console.debug('Service Worker not available:', err);
      });
  });
}

const root = document.getElementById('root');

if (!root) {
  console.error('Root element not found. Check index.html for <div id="root"></div>');
  document.body.innerHTML = '<div id="root"></div>';
}

ReactDOM.createRoot(root || document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

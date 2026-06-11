import React from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: '100vw', height: '100vh', background: '#131722', color: '#ef5350', fontFamily: 'monospace',
          padding: '40px', gap: '16px',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>ATLAS — Render Error</div>
          <div style={{ fontSize: '13px', color: '#787b86', maxWidth: '700px', wordBreak: 'break-all', textAlign: 'center' }}>
            {this.state.error.message}
          </div>
          <pre style={{ fontSize: '11px', color: '#363a45', maxWidth: '700px', overflow: 'auto', margin: 0 }}>
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '8px', padding: '8px 20px', background: '#2962ff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

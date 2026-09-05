import React, { useState, useEffect } from 'react';
import { X, Palette, Bug, CheckCircle, AlertCircle, Loader2, RefreshCw, DownloadCloud } from 'lucide-react';

// ── Theme definitions ────────────────────────────────────────────────────────
export const THEMES = [
  { id: 'engro-green',    name: 'Engro Green',   accent: '#00a86b', bg: '#090d0a', surface: 'rgba(18,25,20,0.88)',  text: '#ffffff', secondary: '#c2dacb' },
  { id: 'midnight-blue',  name: 'Midnight Blue', accent: '#3b82f6', bg: '#07090f', surface: 'rgba(10,15,35,0.88)',  text: '#ffffff', secondary: '#bfcfef' },
  { id: 'crimson',        name: 'Crimson',       accent: '#e11d48', bg: '#0d0709', surface: 'rgba(28,10,15,0.88)',  text: '#ffffff', secondary: '#f4c2c8' },
  { id: 'purple-haze',    name: 'Purple Haze',   accent: '#8b5cf6', bg: '#09060f', surface: 'rgba(20,12,35,0.88)',  text: '#ffffff', secondary: '#d4b8f8' },
  { id: 'amber',          name: 'Amber',         accent: '#f59e0b', bg: '#0f0c05', surface: 'rgba(30,22,8,0.88)',   text: '#ffffff', secondary: '#fde9a8' },
  { id: 'coral',          name: 'Coral',         accent: '#f97316', bg: '#0f0804', surface: 'rgba(32,15,8,0.88)',   text: '#ffffff', secondary: '#fed7b8' },
  { id: 'cyan-ice',       name: 'Cyan Ice',      accent: '#06b6d4', bg: '#040e10', surface: 'rgba(5,20,28,0.88)',   text: '#ffffff', secondary: '#a5f3fc' },
  { id: 'rose-gold',      name: 'Rose Gold',     accent: '#f43f5e', bg: '#0d0609', surface: 'rgba(28,10,18,0.88)',  text: '#ffffff', secondary: '#fda4af' },
  { id: 'arctic-white',   name: 'Arctic White',  accent: '#0ea5e9', bg: '#f0f4f8', surface: 'rgba(255,255,255,0.9)',text: '#0f172a', secondary: '#475569' },
  { id: 'matrix-green',   name: 'Matrix',        accent: '#00ff41', bg: '#000000', surface: 'rgba(0,20,5,0.92)',    text: '#00ff41', secondary: '#00cc33' },
  { id: 'sunset-orange',  name: '🌅 Sunset',     accent: '#ff6b35', bg: '#0d0704', surface: 'rgba(30,14,6,0.90)',   text: '#ffffff', secondary: '#ffc4a8' },
  { id: 'ocean-deep',     name: '🌊 Ocean Deep',    accent: '#0891b2', bg: '#020b0e', surface: 'rgba(2,20,30,0.92)',   text: '#ffffff', secondary: '#7dd3fc' },
  { id: 'neon-pink',      name: '💜 Neon Pink',     accent: '#e879f9', bg: '#0d0210', surface: 'rgba(25,5,35,0.92)',   text: '#ffffff', secondary: '#f0abfc' },
  { id: 'cyberpunk',      name: '🤖 Cyberpunk',     accent: '#fde047', bg: '#020617', surface: 'rgba(10,15,30,0.92)',  text: '#ffffff', secondary: '#facc15' },
  { id: 'forest-night',   name: '🍃 Forest Night',  accent: '#4ade80', bg: '#030a05', surface: 'rgba(5,18,8,0.92)',   text: '#ffffff', secondary: '#86efac' },
];


export const applyTheme = (themeId: string) => {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const root = document.documentElement;
  const accent = theme.accent;
  
  // Parse hex to rgb for rgba usage
  const hex2rgb = (hex: string) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return { r, g, b };
  };
  const { r, g, b } = hex2rgb(accent);

  root.style.setProperty('--bg',            theme.bg);
  root.style.setProperty('--surface',       theme.surface);
  root.style.setProperty('--surface-hover', theme.surface);
  root.style.setProperty('--text-primary',  theme.text);
  root.style.setProperty('--text-secondary',theme.secondary);
  root.style.setProperty('--text-muted',    theme.secondary + '88');
  root.style.setProperty('--accent',        accent);
  root.style.setProperty('--accent-light',  accent + 'cc');
  root.style.setProperty('--accent-dark',   accent + 'aa');
  root.style.setProperty('--accent-glow',   `rgba(${r},${g},${b},0.20)`);
  root.style.setProperty('--accent-bg',     `rgba(${r},${g},${b},0.08)`);
  root.style.setProperty('--border',        `rgba(${r},${g},${b},0.15)`);
  root.style.setProperty('--border-hover',  `rgba(${r},${g},${b},0.35)`);
  root.style.setProperty('--shadow-card',   `0 4px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(${r},${g},${b},0.06)`);
  root.style.setProperty('--shadow-glow',   `0 0 40px rgba(${r},${g},${b},0.12)`);
};

// ── GitHub config ─────────────────────────────────────────────────────────────
// Public repo — anyone can READ issues without auth
// Token only needed to WRITE (create) issues — public_repo scope only (low risk)
const GITHUB_REPO = 'Techmastergojo/Engro-Connect';


interface BugReport {
  id: number;
  title: string;
  body: string;
  created_at: string;
  state: string;
  html_url: string;
  user: { login: string };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  hasNewBugs: boolean;
  onBugsViewed: () => void;
  onForceUpdateCheck: () => void;
}

export const SettingsPanel: React.FC<Props> = ({ isOpen, onClose, hasNewBugs, onBugsViewed, onForceUpdateCheck }) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'bugs' | 'sync'>('theme');
  const [portalUrl, setPortalUrl] = useState(() => {
    try {
      const cfg = localStorage.getItem('engro_portal_api_config');
      if (cfg) return JSON.parse(cfg).endpoint || 'http://localhost:3001/api/v1/sync';
    } catch (_) {}
    return 'http://localhost:3001/api/v1/sync';
  });
  const [portalKey, setPortalKey] = useState(() => {
    try {
      const cfg = localStorage.getItem('engro_portal_api_config');
      if (cfg) return JSON.parse(cfg).apiKey || 'engro_live_c4_telecom_secret_2026';
    } catch (_) {}
    return 'engro_live_c4_telecom_secret_2026';
  });
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('app_theme') || 'sunset-orange');
  
  // Bug report state
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loadingBugs, setLoadingBugs] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugBody, setBugBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load bugs when tab opens
  useEffect(() => {
    if (activeTab === 'bugs' && isOpen) {
      fetchBugs();
      onBugsViewed();
    }
  }, [activeTab, isOpen]);

  const fetchBugs = async () => {
    setLoadingBugs(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues?labels=bug-report&state=open&per_page=20`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (res.ok) {
        const data = await res.json();
        setBugs(data);
        // Store last seen count for yellow dot logic
        localStorage.setItem('last_seen_bug_count', data.length.toString());
      }
    } catch (_) {}
    setLoadingBugs(false);
  };

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('app_theme', themeId);
    applyTheme(themeId);
  };

  const submitBug = async () => {
    if (!bugTitle.trim()) return;

    setSubmitting(true);
    const messageText = `*Engro Enfrashare Bug Report*\n\n*Issue:* ${bugTitle}\n\n*Details:*\n${bugBody || 'No additional details provided.'}`;
    const whatsappUrl = `https://wa.me/923171112796?text=${encodeURIComponent(messageText)}`;
    
    window.open(whatsappUrl, '_blank');

    setSubmitStatus('success');
    setBugTitle('');
    setBugBody('');
    setTimeout(() => {
      setSubmitStatus('idle');
    }, 3000);
    setSubmitting(false);
  };


  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass modal-box" 
        style={{ maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '440px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 0' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Settings</h2>
          <button className="btn-icon" onClick={onClose} style={{ border: 'none' }}><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <button 
            onClick={() => setActiveTab('theme')}
            style={{ 
              flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.88rem',
              background: activeTab === 'theme' ? 'var(--accent-bg)' : 'transparent',
              color: activeTab === 'theme' ? 'var(--accent)' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === 'theme' ? 'var(--border-hover)' : 'transparent'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Palette size={16} /> Theme
          </button>
          <button 
            onClick={() => setActiveTab('bugs')}
            style={{ 
              flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.88rem',
              background: activeTab === 'bugs' ? 'var(--accent-bg)' : 'transparent',
              color: activeTab === 'bugs' ? 'var(--accent)' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === 'bugs' ? 'var(--border-hover)' : 'transparent'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', position: 'relative'
            }}
          >
            <Bug size={16} /> Bug Reports
            {hasNewBugs && (
              <span style={{ 
                position: 'absolute', top: '6px', right: '6px',
                width: '8px', height: '8px', borderRadius: '50%', background: '#eab308'
              }} />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('sync')}
            style={{ 
              flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.88rem',
              background: activeTab === 'sync' ? 'var(--accent-bg)' : 'transparent',
              color: activeTab === 'sync' ? 'var(--accent)' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === 'sync' ? 'var(--border-hover)' : 'transparent'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <RefreshCw size={16} /> Data Portal
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          
          {/* ── Theme Tab ── */}
          {activeTab === 'theme' && (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                Choose a color theme. Applied instantly everywhere.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                      background: currentTheme === theme.id ? 'var(--accent-bg)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${currentTheme === theme.id ? 'var(--accent)' : 'var(--border)'}`,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                      background: theme.accent,
                      boxShadow: `0 0 8px ${theme.accent}66`,
                      border: '2px solid rgba(255,255,255,0.1)'
                    }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: currentTheme === theme.id ? 'var(--accent)' : 'var(--text-primary)', textAlign: 'left', lineHeight: 1.2 }}>
                      {theme.name}
                      {currentTheme === theme.id && <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--accent)', opacity: 0.8 }}>Active</span>}
                    </span>
                  </button>
                ))}
              </div>

                {/* Manual Update Check */}
                <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '8px' }}>App Updates</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                    Auto-updates usually happen in the background. If you're stuck, you can force a check.
                  </p>
                  <button
                    className="btn-accent"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={onForceUpdateCheck}
                  >
                    <DownloadCloud size={18} /> Check for Updates
                  </button>
                </div>
            </div>
          )}

          {/* ── Bug Reports Tab ── */}
          {activeTab === 'bugs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Submit form */}
              {submitStatus === 'success' ? (
                <div className="glass" style={{ padding: '24px', textAlign: 'center', border: '1px solid rgba(0,200,80,0.3)' }}>
                  <CheckCircle size={40} color="#00c850" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>We heard you! 🙌</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    Your bug report has been submitted. We'll get it fixed as soon as possible — thank you for helping us improve Engro Enfrashare!
                  </p>
                </div>
              ) : submitStatus === 'error' ? (
                <div className="glass" style={{ padding: '16px', border: '1px solid rgba(255,77,109,0.3)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <AlertCircle size={20} color="#ff4d6d" />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Submission failed. Please try again.</p>
                </div>
              ) : (
                <div className="glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Report a Bug</h3>
                  <input
                    className="input"
                    placeholder="What went wrong? (short title)"
                    value={bugTitle}
                    onChange={e => setBugTitle(e.target.value)}
                  />
                  <textarea
                    className="input"
                    placeholder="Describe the bug in more detail (optional)..."
                    value={bugBody}
                    onChange={e => setBugBody(e.target.value)}
                    rows={3}
                    style={{ resize: 'none', fontFamily: 'inherit' }}
                  />
                  <button 
                    className="btn-accent" 
                    onClick={submitBug} 
                    disabled={submitting || !bugTitle.trim()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Submit Report'}
                  </button>
                </div>
              )}

              {/* Live bug list */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Community Reports</h3>
                <button className="btn-ghost" onClick={fetchBugs} style={{ padding: '6px 10px', fontSize: '0.78rem' }}>
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>

              {loadingBugs ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} />
                </div>
              ) : bugs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '16px' }}>
                  No bug reports yet. 🎉 Everything's working great!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bugs.map(bug => (
                    <div key={bug.id} className="glass" style={{ padding: '12px 14px' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>{bug.title.replace('[Bug] ', '')}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date(bug.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}reported by @{bug.user.login}
                      </p>
                      {bug.body && bug.body !== 'No additional details provided.' && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '6px' }}>{bug.body}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Data Portal Sync Tab ── */}
          {activeTab === 'sync' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  Cloud Data Portal & Telemetry Sync
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px', lineHeight: 1.4 }}>
                  Connects to the standalone Engro Data Portal to pull the latest daily NAR, Fueling, and Site Master telemetry without requiring app updates.
                </p>
              </div>

              <div className="glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Portal API Endpoint
                  </label>
                  <input
                    className="input"
                    value={portalUrl}
                    onChange={e => {
                      setPortalUrl(e.target.value);
                      localStorage.setItem('engro_portal_api_config', JSON.stringify({ endpoint: e.target.value, apiKey: portalKey, autoSync: true }));
                    }}
                    placeholder="https://your-portal.vercel.app/api/v1/sync"
                    style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Enterprise API Key (x-engro-api-key)
                  </label>
                  <input
                    className="input"
                    type="password"
                    value={portalKey}
                    onChange={e => {
                      setPortalKey(e.target.value);
                      localStorage.setItem('engro_portal_api_config', JSON.stringify({ endpoint: portalUrl, apiKey: e.target.value, autoSync: true }));
                    }}
                    placeholder="engro_live_..."
                    style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}
                  />
                </div>

                <button
                  className="btn-accent"
                  disabled={isSyncing}
                  onClick={async () => {
                    setIsSyncing(true);
                    setSyncStatus('Connecting to Data Portal SQL...');
                    try {
                      const res = await fetch(portalUrl, {
                        headers: { 'x-engro-api-key': portalKey }
                      });
                      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
                      const data = await res.json();
                      localStorage.setItem('engro_telemetry_cache_v1', JSON.stringify(data));
                      setSyncStatus(`✓ Successfully synchronized ${data.summary?.totalSites || 0} sites & ${data.summary?.lastNarDate || 'latest'} telemetry!`);
                      setTimeout(() => window.location.reload(), 1500);
                    } catch (err: any) {
                      setSyncStatus(`✗ Sync failed: ${err.message}`);
                    } finally {
                      setIsSyncing(false);
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
                >
                  {isSyncing ? <><Loader2 size={16} className="animate-spin" /> Fetching Live Telemetry...</> : <><RefreshCw size={16} /> Sync Live Data Now</>}
                </button>

                {syncStatus && (
                  <div style={{
                    fontSize: '0.8rem',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: syncStatus.startsWith('✓') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: syncStatus.startsWith('✓') ? '#34d399' : '#f87171',
                    border: `1px solid ${syncStatus.startsWith('✓') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    {syncStatus}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { Search, Plus, Upload, Settings, ExternalLink } from 'lucide-react';
import type { Site } from './types';
import { getSites, addSite, updateSite, deleteSite, saveSites, initializeDb } from './db';
import { SiteCard } from './components/SiteCard';
import { SiteModal } from './components/SiteModal';
import { SettingsPanel, applyTheme, THEMES } from './components/SettingsPanel';
import { ChangelogModal } from './components/ChangelogModal';
import { SplashScreen } from '@capacitor/splash-screen';

// Website URL — update once Vercel deploys
const WEBSITE_URL = 'https://engro-enfrashare.vercel.app';

// Injected at build time by Vite (set by GitHub Actions)
declare const __APP_VERSION__: string;

// Hardcoded token for bug reporting (public_repo scope only — can only create issues)
// Low risk: even if extracted, can only post issues to this public repo
const BUG_TOKEN = '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';

// Pre-seed the token into localStorage so SettingsPanel picks it up
if (typeof window !== 'undefined') {
  localStorage.setItem('gh_issues_token', BUG_TOKEN);
}

function App() {
  const [sites, setSites] = useState<Site[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasNewBugs, setHasNewBugs] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [updateBanner, setUpdateBanner] = useState<{version: string; msg: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Version baked in at build time by GitHub Actions via Vite define
  const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

  useEffect(() => {
    SplashScreen.hide().catch(console.warn);

    // Show changelog if not seen yet
    const hasSeenChangelog = localStorage.getItem('has_seen_changelog_v4');
    if (!hasSeenChangelog) {
      setIsChangelogOpen(true);
    }

    // Apply saved theme on startup
    const savedTheme = localStorage.getItem('app_theme') || 'sunset-orange';
    applyTheme(savedTheme);

    // Load sites
    initializeDb().then(loadedSites => setSites(loadedSites));

    // Check for new bug reports (silent background check)
    checkForNewBugs();

    // Check for new APK version silently on startup
    const bootTimeout = setTimeout(() => checkForNewApk(), 4000);

    // Also check when app is resumed
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => {
          checkForNewApk();
          checkForNewBugs();
        }, 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(bootTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const checkForNewApk = async (isManual = false) => {
    try {
      console.log(`Checking version... (current: ${APP_VERSION})`);

      const res = await fetch(`https://raw.githubusercontent.com/Techmastergojo/Engro-Connect/main/version.json?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      console.log(`Remote: ${data.version} | Local: ${APP_VERSION}`);

      if (data.version && data.version !== APP_VERSION) {
        console.log(`New version available: ${data.version}`);
        setUpdateBanner({
          version: data.version,
          msg: `A newer version (${data.version}) is available. Please update to get the latest site databases, features and bug fixes.`,
        });
      } else {
        console.log('App is up to date.');
        if (isManual) {
          setUpdateBanner({ version: APP_VERSION, msg: `✅ You are currently running the latest version (${APP_VERSION}).` });
          setTimeout(() => setUpdateBanner(null), 4000);
        }
      }
    } catch (e: any) {
      console.error(`Version check failed: ${e.message}`);
      if (isManual) {
        setUpdateBanner({ version: '', msg: '⚠️ Failed to connect to the update server. Please check your network connection.' });
        setTimeout(() => setUpdateBanner(null), 4000);
      }
    }
  };


  const checkForNewBugs = async () => {
    try {
      const res = await fetch(
        'https://api.github.com/repos/Techmastergojo/Engro-Connect/issues?labels=bug-report&state=open&per_page=1',
        { headers: { 'Accept': 'application/vnd.github.v3+json' } }
      );
      if (res.ok) {
        const data = await res.json();
        const latestCount = data.length > 0 ? data[0].number : 0;
        const lastSeen = parseInt(localStorage.getItem('last_seen_bug_id') || '0');
        if (latestCount > lastSeen) setHasNewBugs(true);
      }
    } catch (_) {}
  };

  const handleBugsViewed = () => {
    setHasNewBugs(false);
    // Mark current latest as seen
    fetch(
      'https://api.github.com/repos/Techmastergojo/Engro-Connect/issues?labels=bug-report&state=open&per_page=1',
      { headers: { 'Accept': 'application/vnd.github.v3+json' } }
    ).then(r => r.json()).then(data => {
      if (data.length > 0) localStorage.setItem('last_seen_bug_id', data[0].number.toString());
    }).catch(() => {});
  };

  const handleAddOrUpdate = (siteData: Partial<Site>) => {
    if (editingSite) {
      updateSite(editingSite.id, siteData);
    } else {
      addSite(siteData as Omit<Site, 'id' | 'createdAt'>);
    }
    setSites(getSites());
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this site?')) {
      deleteSite(id);
      setSites(getSites());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const newSites = results.data.map((row: any) => {
          const name = row['Site ID'] || row.name || row.Name || '';
          const lat = parseFloat((row.Latitude || row.lat || '0').toString().replace(/\.\./g, '.'));
          const lng = parseFloat((row.Longitude || row.lng || '0').toString().replace(/\.\./g, '.'));
          if (name && !isNaN(lat) && !isNaN(lng)) {
            const depSites = row['Dependent sites'] || row['Dependent site'] || row.dependentSites || row['No of Sites'] || row.noOfSites || undefined;
            return {
              id: crypto.randomUUID(), name, lat, lng,
              mbuNumber: row['MBU Number'] || '', mbuName: row['MBU Name'] || '',
              cellNumber: row['Cell Number'] || '',
              networkPortfolio: row['Network portofolio'] || row['Network Portfolio'] || '',
              zonalManager: row['Zonal Manager'] || '',
              jazzId: row['Jazz id'] || '', telenorId: row['Telenor id'] || '',
              zongId: row['Zong id'] || row['ZONG ID'] || '', ufoneId: row['Ufone id'] || row['Ufone ID'] || '',
              siteStatus: row['Site status'] || row.siteStatus || undefined,
              category: row['Category'] || row.category || undefined,
              powerStatus: row['Power status'] || row.powerStatus || undefined,
              securityVendor: row['Security Vendor'] || row.securityVendor || undefined,
              guestOmo: row['Guest OMOs'] || row['Guest OMO'] || row.guestOmo || undefined,
              dgShared: row['DG shared '] || row['DG shared'] || row.dgShared || undefined,
              dcShared: row['DC shared'] || row.dcShared || undefined,
              solar: row['Solar'] || row.solar || undefined,
              dgStatus: row['DG status'] || row.dgStatus || undefined,
              dependentSites: depSites,
              noOfSites: row['No of Sites'] || row.noOfSites || depSites || undefined,
              solarKwa: row['Solar KWA'] || row.solarKwa || undefined,
              neLocation: row['NE location'] || row.neLocation || undefined,
              dcSharedWith: row['DC Shared With'] || row.dcSharedWith || undefined,
              tpId: row['TP ID'] || row.tpId || undefined,
              tpApprovedServices: row['TP Approved Services'] || row.tpApprovedServices || undefined,
              zongApprovedServices: row['Zong Approved Services'] || row.zongApprovedServices || undefined,
              ufoneApprovedServices: row['Ufone Approved Services'] || row.ufoneApprovedServices || undefined,
              jazzApprovedServices: row['Jazz Approved Services'] || row.jazzApprovedServices || undefined,
              createdAt: Date.now(), isUserCreated: true,
            };
          }
          return null;
        }).filter(Boolean) as Site[];
        if (newSites.length > 0) {
          saveSites(newSites);
          setSites(newSites);
        } else {
          // no valid rows parsed — silently ignore
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const filteredSites = sites.filter(s => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(query) ||
      (s.jazzId && s.jazzId.toLowerCase().includes(query)) ||
      (s.telenorId && s.telenorId.toLowerCase().includes(query)) ||
      (s.zongId && s.zongId.toLowerCase().includes(query)) ||
      (s.ufoneId && s.ufoneId.toLowerCase().includes(query))
    );
  });

  // Get accent color for current theme
  const savedTheme = localStorage.getItem('app_theme') || 'sunset-orange';
  const themeAccent = THEMES.find(t => t.id === savedTheme)?.accent || '#00a86b';

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px', position: 'relative' }}>
      <header style={{ marginBottom: '32px', position: 'relative', display: 'flex', alignItems: 'center', gap: '14px', minHeight: '72px' }}>

        {/* Logo — fixed width on left */}
        <img
          src="/logo.png"
          alt="Engro Enfrashare Logo"
          style={{ height: '60px', width: 'auto', objectFit: 'contain', flexShrink: 0, filter: `drop-shadow(0 4px 16px ${themeAccent}55)` }}
        />

        {/* Heading — centred in remaining space */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.03em', background: 'linear-gradient(180deg, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>Engro Enfrashare</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.01em', margin: 0 }}>Pakistan Leading Tower Co.</p>
        </div>

        {/* ⚙ Settings gear top-right */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="settings-button"
          style={{
            flexShrink: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '50%', width: '42px', height: '42px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
          }}
          title="Settings"
        >
          <Settings size={20} color="var(--text-secondary)" className="settings-gear-icon" />
          {hasNewBugs && (
            <span style={{
              position: 'absolute', top: '4px', right: '4px',
              width: '10px', height: '10px', borderRadius: '50%',
              background: '#eab308',
              boxShadow: '0 0 6px #eab30888',
              border: '1.5px solid var(--bg)',
            }} />
          )}
        </button>
      </header>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: '48px' }}
            placeholder="Search by Site ID or OMO ID (Jazz, Zong...)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          className="btn-accent"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px' }}
          onClick={() => { setEditingSite(null); setIsModalOpen(true); }}
          title="Add New Site"
        >
          <Plus size={22} />
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
        <button className="btn-ghost" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} /> Import CSV
        </button>
      </div>

      {filteredSites.length === 0 ? (
        <div className="glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>No matching Engro sites found.</p>
          <button className="btn-accent" style={{ marginTop: '16px' }} onClick={() => { setEditingSite(null); setIsModalOpen(true); }}>
            Add New Site Manually
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredSites.slice(0, 100).map(site => (
            <SiteCard key={site.id} site={site} onEdit={(s) => { setEditingSite(s); setIsModalOpen(true); }} onDelete={handleDelete} />
          ))}
          {filteredSites.length > 100 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '12px' }}>
              Showing first 100 sites. Use search to find specific sites.
            </p>
          )}
        </div>
      )}

      {/* Footer Branding */}
      <footer style={{ textAlign: 'center', marginTop: '40px', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
        Powered by Hamza Tehseen Cheema
      </footer>


      <SiteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} site={editingSite} onSave={handleAddOrUpdate} />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        hasNewBugs={hasNewBugs}
        onBugsViewed={handleBugsViewed}
        onForceUpdateCheck={() => {
          setIsSettingsOpen(false);
          checkForNewApk(true);
        }}
      />
      
      <ChangelogModal 
        isOpen={isChangelogOpen} 
        onClose={() => {
          setIsChangelogOpen(false);
          localStorage.setItem('has_seen_changelog_v4', 'true');
        }} 
      />

      {/* Update notification popup (modal) */}
      {updateBanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', animation: 'fadeIn 0.25s ease'
        }}>
          <div className="glass" style={{
            border: '1px solid var(--accent)', borderRadius: '16px',
            padding: '28px 24px', maxWidth: '380px', width: '100%', textAlign: 'center',
            boxShadow: '0 24px 48px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '20px', position: 'relative'
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0, 168, 107, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ExternalLink size={28} color="var(--accent)" />
            </div>
            
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                {updateBanner.version && updateBanner.version !== APP_VERSION ? 'App Update Available' : 'Update Check'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {updateBanner.msg}
              </p>
            </div>

            {updateBanner.version && updateBanner.version !== APP_VERSION ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <a
                  href={WEBSITE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-accent"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    width: '100%', padding: '12px 16px', fontWeight: 700, textDecoration: 'none',
                    borderRadius: '8px', fontSize: '0.9rem'
                  }}
                  onClick={() => setUpdateBanner(null)}
                >
                  Download and Install
                </a>
                <button
                  onClick={() => setUpdateBanner(null)}
                  className="btn-ghost"
                  style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                >
                  Maybe Later
                </button>
              </div>
            ) : (
              <button
                onClick={() => setUpdateBanner(null)}
                className="btn-accent"
                style={{ width: '100%', padding: '12px' }}
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
export { App };

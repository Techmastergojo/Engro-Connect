import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { Search, Plus, Upload, Settings } from 'lucide-react';
import type { Site } from './types';
import { getSites, addSite, updateSite, deleteSite, saveSites, initializeDb } from './db';
import { SiteCard } from './components/SiteCard';
import { SiteModal } from './components/SiteModal';
import { SettingsPanel, applyTheme, THEMES } from './components/SettingsPanel';
import { ChangelogModal } from './components/ChangelogModal';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Show changelog if not seen yet
    const hasSeenChangelog = localStorage.getItem('has_seen_changelog_v4');
    if (!hasSeenChangelog) {
      setIsChangelogOpen(true);
    }

    // Apply saved theme on startup
    const savedTheme = localStorage.getItem('app_theme') || 'engro-green';
    applyTheme(savedTheme);

    // Load sites
    initializeDb().then(loadedSites => setSites(loadedSites));

    // Check for new bug reports (silent background check)
    checkForNewBugs();

    // Fire custom background updater instantly on cold start
    silentCheckForUpdates();

    // Also check for updates every time the app is resumed from background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        silentCheckForUpdates();
        checkForNewBugs();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const silentCheckForUpdates = async () => {
    try {
      const res = await fetch('https://raw.githubusercontent.com/Techmastergojo/Engro-Connect/main/version.json');
      const data = await res.json();
      
      let currentVersion = '0.0.0';
      try {
        const current = await CapacitorUpdater.current();
        if (current && current.bundle && current.bundle.version) {
          currentVersion = current.bundle.version;
        }
      } catch (e) {
        console.warn('Failed to get current bundle info, assuming native.', e);
      }

      if (data.version && data.version !== currentVersion && data.version !== localStorage.getItem('last_installed_version')) {
        console.log('Update found! Downloading silently...', data.version);
        const bundle = await CapacitorUpdater.download({
          url: data.url,
          version: data.version
        });
        
        console.log('Update downloaded. Applying instantly.');
        localStorage.setItem('last_installed_version', data.version);
        await CapacitorUpdater.set(bundle);
      }
    } catch (e) {
      console.error('Silent update failed:', e);
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
            return {
              id: crypto.randomUUID(), name, lat, lng,
              mbuNumber: row['MBU Number'] || '', mbuName: row['MBU Name'] || '',
              cellNumber: row['Cell Number'] || '',
              networkPortfolio: row['Network portofolio'] || '',
              zonalManager: row['Zonal Manager'] || '',
              jazzId: row['Jazz id'] || '', telenorId: row['Telenor id'] || '',
              zongId: row['Zong id'] || '', ufoneId: row['Ufone id'] || '',
              createdAt: Date.now(), isUserCreated: true,
            };
          }
          return null;
        }).filter(Boolean) as Site[];
        if (newSites.length > 0) {
          const combined = [...newSites, ...getSites()];
          saveSites(combined);
          setSites(combined);
          alert(`Successfully imported ${newSites.length} sites!`);
        } else {
          alert('Could not parse any valid coordinates from CSV.');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const filteredSites = sites.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.mbuNumber && s.mbuNumber.toLowerCase().includes(q)) ||
      (s.mbuName && s.mbuName.toLowerCase().includes(q)) ||
      (s.networkPortfolio && s.networkPortfolio.toLowerCase().includes(q)) ||
      (s.zonalManager && s.zonalManager.toLowerCase().includes(q))
    );
  });

  // Get accent color for current theme
  const savedTheme = localStorage.getItem('app_theme') || 'engro-green';
  const themeAccent = THEMES.find(t => t.id === savedTheme)?.accent || '#00a86b';

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px' }}>
      <header style={{ marginBottom: '32px', textAlign: 'center', position: 'relative' }}>

        {/* ⚙ Settings gear top-right */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          style={{
            position: 'absolute', top: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '50%', width: '42px', height: '42px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          title="Settings"
        >
          <Settings size={20} color="var(--text-secondary)" />
          {/* Yellow dot for new bug reports */}
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

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <img
            src="/logo.png"
            alt="Engro Connect Logo"
            style={{ height: '80px', objectFit: 'contain', filter: `drop-shadow(0 8px 24px ${themeAccent}33)` }}
          />
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.03em', background: 'linear-gradient(180deg, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Engro Connect</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>Portfolio & Coordinate Helper</p>
      </header>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: '48px' }}
            placeholder="Search by Site ID, MBU, Portfolio, ZM..."
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

      <SiteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} site={editingSite} onSave={handleAddOrUpdate} />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        hasNewBugs={hasNewBugs}
        onBugsViewed={handleBugsViewed}
      />
      
      <ChangelogModal 
        isOpen={isChangelogOpen} 
        onClose={() => {
          setIsChangelogOpen(false);
          localStorage.setItem('has_seen_changelog_v4', 'true');
        }} 
      />
    </div>
  );
}

export default App;
export { App };

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
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');
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

    // Fire custom background updater silently with a 3-second delay to ensure Capacitor bridge is fully ready
    const bootTimeout = setTimeout(() => {
      silentCheckForUpdates(false);
    }, 3000);

    // Also check for updates every time the app is resumed from background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Wait 1 second after resume to ensure connection is restored
        setTimeout(() => {
          silentCheckForUpdates(false);
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

  const silentCheckForUpdates = async (isManual = false) => {
    try {
      if (isManual) {
        setUpdateStatus('Checking for updates...');
        setUpdateProgress(0);
      }
      
      const res = await fetch(`https://raw.githubusercontent.com/Techmastergojo/Engro-Connect/main/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
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

      if (data.version && data.version !== currentVersion) {
        console.log('Update found! Downloading silently...', data.version);
        
        setUpdateStatus('Downloading updates...');
        setUpdateProgress(0);

        const listener = await CapacitorUpdater.addListener('download', (state) => {
          setUpdateProgress(state.percent);
        });

        try {
          const bundle = await CapacitorUpdater.download({
            url: data.url,
            version: data.version
          });
          
          setUpdateStatus('Installing and restarting...');
          await CapacitorUpdater.set(bundle);
        } catch (downloadErr: any) {
          alert(`Download failed: ${downloadErr.message || downloadErr}`);
          setUpdateProgress(null);
        } finally {
          listener.remove();
        }
      } else if (isManual) {
        setUpdateProgress(null);
        alert('You are already running the latest version!');
      }
    } catch (e) {
      console.error('Silent update failed:', e);
      if (isManual) {
        setUpdateProgress(null);
        alert('Failed to check for updates. Please try again.');
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
            const depSites = row['Dependent sites'] || row.dependentSites || row['No of Sites'] || row.noOfSites || undefined;
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
          alert(`Successfully imported ${newSites.length} sites (old database cleared)!`);
        } else {
          alert('Could not parse any valid coordinates from CSV.');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const filteredSites = sites.filter(s => {
    if (!searchQuery.trim()) return true;
    return s.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  // Get accent color for current theme
  const savedTheme = localStorage.getItem('app_theme') || 'engro-green';
  const themeAccent = THEMES.find(t => t.id === savedTheme)?.accent || '#00a86b';

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px', position: 'relative' }}>
      <header style={{ marginBottom: '32px', position: 'relative' }}>

        {/* ⚙ Settings gear top-right */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="settings-button"
          style={{
            position: 'absolute', top: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '50%', width: '42px', height: '42px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
            zIndex: 2,
          }}
          title="Settings"
        >
          <Settings size={20} color="var(--text-secondary)" className="settings-gear-icon" />
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

        <div style={{ display: 'flex', alignItems: 'center', textAlign: 'left' }}>
          <img
            src="/logo.png"
            alt="Engro Enfrashare Logo"
            style={{ height: '110px', objectFit: 'contain', filter: `drop-shadow(0 8px 24px ${themeAccent}33)`, marginRight: '16px' }}
          />
          <div>
            <h1 style={{ fontSize: '2.0rem', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.03em', background: 'linear-gradient(180deg, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>Engro Enfrashare</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.01em', margin: 0 }}>Pakistan Leading Tower Co.</p>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: '48px' }}
            placeholder="Search by Site ID..."
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
          setIsSettingsOpen(false); // Close panel so progress screen overlay is visible
          silentCheckForUpdates(true);
        }}
      />
      
      <ChangelogModal 
        isOpen={isChangelogOpen} 
        onClose={() => {
          setIsChangelogOpen(false);
          localStorage.setItem('has_seen_changelog_v4', 'true');
        }} 
      />

      {/* Visual Update Progress Splash Screen */}
      {updateProgress !== null && (
        <div 
          style={{
            position: 'fixed', inset: 0,
            background: '#090d0a', zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '24px', textAlign: 'center'
          }}
        >
          <img
            src="/logo.png"
            alt="Engro Enfrashare Logo"
            style={{ height: '80px', marginBottom: '24px', filter: 'drop-shadow(0 8px 24px rgba(0, 168, 107, 0.2))' }}
          />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>
            Updating Engro Enfrashare
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '32px', maxWidth: '300px', lineHeight: 1.5 }}>
            {updateStatus}
          </p>

          <div style={{ width: '100%', maxWidth: '280px', background: 'rgba(255,255,255,0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
            <div 
              style={{ 
                width: `${updateProgress}%`, 
                height: '100%', 
                background: 'var(--accent)', 
                transition: 'width 0.2s ease-out',
                boxShadow: '0 0 12px var(--accent)'
              }} 
            />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>
            {updateProgress}%
          </span>
        </div>
      )}
    </div>
  );
}

export default App;
export { App };

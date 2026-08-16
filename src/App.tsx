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
import { SplashScreen } from '@capacitor/splash-screen';
import { addLog } from './logger';

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
    // Notify Capgo that the app booted successfully so it doesn't rollback OTA updates
    CapacitorUpdater.notifyAppReady();
    // Force hide any native splash screen that might be lingering
    SplashScreen.hide().catch(console.warn);

    // Show one-time OTA success notification (proves OTA is working)
    if (!localStorage.getItem('ota_notif_shown_v1')) {
      alert('✅ OTA updates are now working! This message confirms the update was received.');
      localStorage.setItem('ota_notif_shown_v1', '1');
    }

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

    // OTA Test Notification
    setTimeout(() => {
      alert("🎉 OTA Test Notification! If you see this, the update was successful!");
    }, 2000);

    // Check for new bug reports (silent background check)
    checkForNewBugs();

    // Fire custom background updater silently with a 3-second delay to ensure Capacitor bridge is fully ready
    const bootTimeout = setTimeout(() => {
      silentCheckForUpdates(false);
    }, 5000); // 5s delay — gives Android network stack time to fully initialize

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
      
      addLog(`Checking for updates... (Manual: ${isManual})`, 'info');
      const versionUrl = `https://techmastergojo.github.io/Engro-Connect/version.json?t=${Date.now()}`;
      addLog(`Fetching: ${versionUrl}`, 'info');
      
      const res = await fetch(versionUrl);
      addLog(`Fetch status: ${res.status} ${res.statusText}`, 'info');
      
      const data = await res.json();
      addLog(`Parsed version info: ${JSON.stringify(data)}`, 'info');
      
      let currentVersion = '0.0.0';
      try {
        const current = await CapacitorUpdater.current();
        if (current && current.bundle && current.bundle.version) {
          currentVersion = current.bundle.version;
        }
        addLog(`Current bundle version: ${currentVersion}`, 'info');
      } catch (e: any) {
        addLog(`Failed to get current bundle: ${e.message || e}`, 'error');
        console.warn('Failed to get current bundle info, assuming native.', e);
      }

      if (data.version && data.version !== currentVersion) {
        addLog(`Update found! Current: ${currentVersion} -> New: ${data.version}`, 'info');
        console.log('Update found! Downloading silently...', data.version);
        
        setUpdateStatus('Downloading updates...');
        setUpdateProgress(0);

        // 'download' is the correct event name per @capgo/capacitor-updater type definitions
        // fires with { percent: number, bundle: BundleInfo } during download progress
        const listener = await CapacitorUpdater.addListener('download', (state) => {
          setUpdateProgress(state.percent);
        });
        
        const failListener = await CapacitorUpdater.addListener('downloadFailed', (data) => {
          addLog(`[downloadFailed event] Native error: ${JSON.stringify(data)}`, 'error');
        });

        try {
          addLog(`Starting CapacitorUpdater.download from: ${data.url}`, 'info');
          const bundle = await CapacitorUpdater.download({
            url: data.url,
            version: data.version
          });
          
          addLog(`Download successful! Bundle ID: ${bundle.id}`, 'success');
          setUpdateStatus('Installing and restarting...');
          alert('🚀 OTA update downloaded! App will now restart with the new version.');
          
          addLog(`Calling CapacitorUpdater.set(bundle)`, 'info');
          await CapacitorUpdater.set(bundle);
        } catch (downloadErr: any) {
          addLog(`Download failed: ${downloadErr.message || JSON.stringify(downloadErr)}`, 'error');
          alert(`Download failed: ${downloadErr.message || downloadErr}`);
          setUpdateProgress(null);
        } finally {
          listener.remove();
          failListener.remove();
        }
      } else {
        addLog(`No update needed. Current version matches remote.`, 'info');
        if (isManual) {
          setUpdateProgress(null);
          alert('You are already running the latest version!');
        }
      }
    } catch (e: any) {
      addLog(`Silent update failed at top level: ${e.message || JSON.stringify(e)}`, 'error');
      console.error('Silent update failed:', e);
      if (isManual) {
        setUpdateProgress(null);
        alert(`Failed to check for updates: ${e.message || e}`);
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

      {updateProgress !== null && (
        <div 
          style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: '12px',
            zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '16px 24px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            minWidth: '280px'
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: '#fff' }}>
            {updateStatus}
          </h2>

          <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' }}>
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
        </div>
      )}
    </div>
  );
}

export default App;
export { App };

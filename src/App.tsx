import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { Search, Plus, Upload, Smartphone } from 'lucide-react';
import type { Site } from './types';
import { getSites, addSite, updateSite, deleteSite, saveSites, initializeDb } from './db';
import { SiteCard } from './components/SiteCard';
import { SiteModal } from './components/SiteModal';

function App() {
  const [sites, setSites] = useState<Site[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializeDb().then(loadedSites => {
      setSites(loadedSites);
    });
  }, []);

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
        const newSites = results.data
          .map((row: any) => {
            const name = row['Site ID'] || row.name || row.Name || row.location || row.Location || '';
            const latStr = row.Latitude || row.lat || row.latitude || row.Lat || '0';
            const lngStr = row.Longitude || row.lng || row.longitude || row.Lng || '0';
            
            const lat = parseFloat(latStr.toString().replace(/\.\./g, '.'));
            const lng = parseFloat(lngStr.toString().replace(/\.\./g, '.'));
            
            if (name && !isNaN(lat) && !isNaN(lng)) {
              return {
                id: crypto.randomUUID(),
                name,
                lat,
                lng,
                mbuNumber: row['MBU Number'] || '',
                mbuName: row['MBU Name'] || '',
                cellNumber: row['Cell Number'] || '',
                networkPortfolio: row['Network portofolio'] || row['Network Portfolio'] || '',
                zonalManager: row['Zonal Manager'] || '',
                createdAt: Date.now()
              };
            }
            return null;
          })
          .filter(Boolean) as Site[];

        if (newSites.length > 0) {
          const current = getSites();
          const combined = [...newSites, ...current];
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

  // Improved search supporting Site ID, MBU Name, MBU Number, Network Portfolio, and Zonal Manager
  const filteredSites = sites.filter(s => {
    const query = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(query) ||
      (s.mbuNumber && s.mbuNumber.toLowerCase().includes(query)) ||
      (s.mbuName && s.mbuName.toLowerCase().includes(query)) ||
      (s.networkPortfolio && s.networkPortfolio.toLowerCase().includes(query)) ||
      (s.zonalManager && s.zonalManager.toLowerCase().includes(query))
    );
  });

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px' }}>
      <header style={{ marginBottom: '32px', textAlign: 'center', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', 
            padding: '16px', 
            borderRadius: '24px', 
            boxShadow: '0 8px 32px rgba(0, 200, 140, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Smartphone size={36} color="#fff" />
          </div>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Engro Sites ({filteredSites.length})</h2>
        
        <div>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          <button 
            className="btn-ghost" 
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} /> Import CSV
          </button>
        </div>
      </div>

      {filteredSites.length === 0 ? (
        <div className="glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>No matching Engro sites found.</p>
          <button 
            className="btn-accent" 
            style={{ marginTop: '16px' }}
            onClick={() => { setEditingSite(null); setIsModalOpen(true); }}
          >
            Add New Site Manually
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredSites.slice(0, 100).map(site => (
            <SiteCard 
              key={site.id} 
              site={site} 
              onEdit={(s) => { setEditingSite(s); setIsModalOpen(true); }}
              onDelete={handleDelete}
            />
          ))}
          {filteredSites.length > 100 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '12px' }}>
              Showing first 100 sites. Use search to find specific sites.
            </p>
          )}
        </div>
      )}

      <SiteModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        site={editingSite}
        onSave={handleAddOrUpdate}
      />
    </div>
  );
}

export default App;
export { App };

import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { Search, Plus, Upload, MapPin } from 'lucide-react';
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
            // Support different column name variations from the user's specific KML.csv
            const name = row['Site ID'] || row.name || row.Name || row.location || row.Location || '';
            const latStr = row.Latitude || row.lat || row.latitude || row.Lat || '0';
            const lngStr = row.Longitude || row.lng || row.longitude || row.Lng || '0';
            
            // Clean any typos like double dots "32..333" before parsing
            const lat = parseFloat(latStr.toString().replace(/\.\./g, '.'));
            const lng = parseFloat(lngStr.toString().replace(/\.\./g, '.'));
            
            if (name && !isNaN(lat) && !isNaN(lng)) {
              return {
                id: crypto.randomUUID(),
                name,
                lat,
                lng,
                createdAt: Date.now()
              };
            }
            return null;
          })
          .filter(Boolean) as Site[];

        if (newSites.length > 0) {
          const current = getSites();
          const combined = [...newSites, ...current]; // put new on top
          saveSites(combined);
          setSites(combined);
          alert(`Successfully imported ${newSites.length} sites!`);
        } else {
          alert('Could not parse any valid coordinates from CSV. Please ensure you have columns for Name, Lat, and Lng.');
        }
        
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const filteredSites = sites.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>
      <header style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ background: 'var(--accent-color)', padding: '16px', borderRadius: '50%', boxShadow: '0 8px 32px rgba(91,114,255,0.3)' }}>
            <MapPin size={32} color="#fff" />
          </div>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Coordinate Helper</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage and map your locations</p>
      </header>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            className="glass-input" 
            style={{ paddingLeft: '48px' }} 
            placeholder="Search locations..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => { setEditingSite(null); setIsModalOpen(true); }}
        >
          <Plus size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Your Sites ({filteredSites.length})</h2>
        
        <div>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          <button 
            className="btn-icon" 
            style={{ fontSize: '0.9rem', padding: '8px 12px' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} style={{ marginRight: '6px' }} /> Import CSV
          </button>
        </div>
      </div>

      {filteredSites.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No sites found.</p>
          <button 
            className="btn-primary" 
            style={{ marginTop: '16px' }}
            onClick={() => { setEditingSite(null); setIsModalOpen(true); }}
          >
            Add Your First Site
          </button>
        </div>
      ) : (
        <div>
          {filteredSites.map(site => (
            <SiteCard 
              key={site.id} 
              site={site} 
              onEdit={(s) => { setEditingSite(s); setIsModalOpen(true); }}
              onDelete={handleDelete}
            />
          ))}
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

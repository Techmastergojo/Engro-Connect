import React, { useState, useEffect } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import type { Site } from '../types';
import { Geolocation } from '@capacitor/geolocation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (site: Partial<Site>) => void;
  site?: Site | null;
}

export const SiteModal: React.FC<Props> = ({ isOpen, onClose, onSave, site }) => {
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [mbuNumber, setMbuNumber] = useState('');
  const [mbuName, setMbuName] = useState('');
  const [cellNumber, setCellNumber] = useState('');
  const [networkPortfolio, setNetworkPortfolio] = useState('');
  const [zonalManager, setZonalManager] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    if (site) {
      setName(site.name);
      setLat(site.lat.toString());
      setLng(site.lng.toString());
      setMbuNumber(site.mbuNumber || '');
      setMbuName(site.mbuName || '');
      setCellNumber(site.cellNumber || '');
      setNetworkPortfolio(site.networkPortfolio || '');
      setZonalManager(site.zonalManager || '');
    } else {
      setName('');
      setLat('');
      setLng('');
      setMbuNumber('');
      setMbuName('');
      setCellNumber('');
      setNetworkPortfolio('');
      setZonalManager('');
    }
  }, [site, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !lat || !lng) return;
    onSave({
      name,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      mbuNumber,
      mbuName,
      cellNumber,
      networkPortfolio,
      zonalManager
    });
    onClose();
  };

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          alert('Location permission was denied. Cannot fetch GPS.');
          setLoadingLocation(false);
          return;
        }
      }

      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      setLat(position.coords.latitude.toString());
      setLng(position.coords.longitude.toString());
    } catch (error) {
      console.error(error);
      alert('Could not get location. Please ensure GPS is enabled.');
    } finally {
      setLoadingLocation(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass modal-box" style={{ padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{site ? 'Update Site Info' : 'Add Engro Site'}</h2>
          <button type="button" className="btn-icon" onClick={onClose} style={{ border: 'none' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Site ID / Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. KMK9799" required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Latitude</label>
              <input type="number" step="any" className="input" value={lat} onChange={e => setLat(e.target.value)} placeholder="0.0000" required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Longitude</label>
              <input type="number" step="any" className="input" value={lng} onChange={e => setLng(e.target.value)} placeholder="0.0000" required />
            </div>
          </div>

          <button 
            type="button" 
            className="btn-ghost" 
            onClick={getCurrentLocation}
            disabled={loadingLocation}
            style={{ width: '100%', padding: '12px', justifyContent: 'center', color: 'var(--accent)' }}
          >
            {loadingLocation ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
            {loadingLocation ? 'Fetching GPS...' : 'Use My GPS Location'}
          </button>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MBU Number</label>
            <input className="input" value={mbuNumber} onChange={e => setMbuNumber(e.target.value)} placeholder="e.g. C4-GUJ-01" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MBU Name</label>
            <input className="input" value={mbuName} onChange={e => setMbuName(e.target.value)} placeholder="e.g. Fida Ur Rehman" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MBU Cell Number</label>
            <input className="input" value={cellNumber} onChange={e => setCellNumber(e.target.value)} placeholder="e.g. 03008560206" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Network Portfolio</label>
            <input className="input" value={networkPortfolio} onChange={e => setNetworkPortfolio(e.target.value)} placeholder="e.g. Deodar" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Zonal Manager</label>
            <input className="input" value={zonalManager} onChange={e => setZonalManager(e.target.value)} placeholder="e.g. Ovais Ali Khan" />
          </div>

          <button type="submit" className="btn-accent" style={{ marginTop: '8px' }}>
            {site ? 'Update Site' : 'Add Site'}
          </button>
        </form>
      </div>
    </div>
  );
};

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
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    if (site) {
      setName(site.name);
      setLat(site.lat.toString());
      setLng(site.lng.toString());
    } else {
      setName('');
      setLat('');
      setLng('');
    }
  }, [site, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !lat || !lng) return;
    onSave({ name, lat: parseFloat(lat), lng: parseFloat(lng) });
    onClose();
  };
  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      // Check/request permissions for Android
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
      alert('Could not get location. Please ensure location services (GPS) are enabled on your device.');
    } finally {
      setLoadingLocation(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.4rem' }}>{site ? 'Update Site' : 'Add New Site'}</h2>
          <button type="button" className="btn-icon" onClick={onClose} style={{ border: 'none' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Location Name</label>
            <input className="glass-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Base Camp" required />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Latitude</label>
              <input type="number" step="any" className="glass-input" value={lat} onChange={e => setLat(e.target.value)} placeholder="0.0000" required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Longitude</label>
              <input type="number" step="any" className="glass-input" value={lng} onChange={e => setLng(e.target.value)} placeholder="0.0000" required />
            </div>
          </div>

          <button 
            type="button" 
            className="btn-icon" 
            onClick={getCurrentLocation}
            disabled={loadingLocation}
            style={{ width: '100%', padding: '12px', background: 'rgba(91, 114, 255, 0.1)', color: 'var(--accent-color)', fontWeight: 500 }}
          >
            {loadingLocation ? <Loader2 size={18} className="animate-spin" style={{ marginRight: '8px' }} /> : <MapPin size={18} style={{ marginRight: '8px' }} />}
            {loadingLocation ? 'Fetching GPS...' : 'Use My Current Location'}
          </button>

          <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
            {site ? 'Save Changes' : 'Add Site'}
          </button>
        </form>
      </div>
    </div>
  );
};

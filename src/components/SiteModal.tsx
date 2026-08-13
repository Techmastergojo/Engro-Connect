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
  const [jazzId, setJazzId] = useState('');
  const [telenorId, setTelenorId] = useState('');
  const [zongId, setZongId] = useState('');
  const [ufoneId, setUfoneId] = useState('');
  const [siteStatus, setSiteStatus] = useState('');
  const [category, setCategory] = useState('');
  const [powerStatus, setPowerStatus] = useState('');
  const [securityVendor, setSecurityVendor] = useState('');
  const [guestOmo, setGuestOmo] = useState('');
  const [dgShared, setDgShared] = useState('');
  const [dcShared, setDcShared] = useState('');
  const [solar, setSolar] = useState('');
  const [dgStatus, setDgStatus] = useState('');
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
      setJazzId(site.jazzId || '');
      setTelenorId(site.telenorId || '');
      setZongId(site.zongId || '');
      setUfoneId(site.ufoneId || '');
      setSiteStatus(site.siteStatus || '');
      setCategory(site.category || '');
      setPowerStatus(site.powerStatus || '');
      setSecurityVendor(site.securityVendor || '');
      setGuestOmo(site.guestOmo || '');
      setDgShared(site.dgShared || '');
      setDcShared(site.dcShared || '');
      setSolar(site.solar || '');
      setDgStatus(site.dgStatus || '');
    } else {
      setName('');
      setLat('');
      setLng('');
      setMbuNumber('');
      setMbuName('');
      setCellNumber('');
      setNetworkPortfolio('');
      setZonalManager('');
      setJazzId('');
      setTelenorId('');
      setZongId('');
      setUfoneId('');
      setSiteStatus('');
      setCategory('');
      setPowerStatus('');
      setSecurityVendor('');
      setGuestOmo('');
      setDgShared('');
      setDcShared('');
      setSolar('');
      setDgStatus('');
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
      zonalManager,
      jazzId,
      telenorId,
      zongId,
      ufoneId,
      siteStatus,
      category,
      powerStatus,
      securityVendor,
      guestOmo,
      dgShared,
      dcShared,
      solar,
      dgStatus
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Site Status</label>
              <input className="input" value={siteStatus} onChange={e => setSiteStatus(e.target.value)} placeholder="e.g. Single / Shared" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Category</label>
              <input className="input" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Gold / Silver" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Power Status</label>
              <input className="input" value={powerStatus} onChange={e => setPowerStatus(e.target.value)} placeholder="e.g. Poor Grid" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>DG Status</label>
              <input className="input" value={dgStatus} onChange={e => setDgStatus(e.target.value)} placeholder="e.g. Operational" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Security Vendor</label>
              <input className="input" value={securityVendor} onChange={e => setSecurityVendor(e.target.value)} placeholder="e.g. Al-Safeena" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Guest OMO</label>
              <input className="input" value={guestOmo} onChange={e => setGuestOmo(e.target.value)} placeholder="e.g. UFONE/TELENOR" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>DG Shared</label>
              <input className="input" value={dgShared} onChange={e => setDgShared(e.target.value)} placeholder="e.g. TELENOR" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>DC Shared</label>
              <input className="input" value={dcShared} onChange={e => setDcShared(e.target.value)} placeholder="e.g. UFONE/TELENOR" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Solar Installed</label>
            <input className="input" value={solar} onChange={e => setSolar(e.target.value)} placeholder="e.g. Yes / No" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Jazz ID</label>
              <input className="input" value={jazzId} onChange={e => setJazzId(e.target.value)} placeholder="e.g. JZ-123" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Telenor ID</label>
              <input className="input" value={telenorId} onChange={e => setTelenorId(e.target.value)} placeholder="e.g. TL-123" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Zong ID</label>
              <input className="input" value={zongId} onChange={e => setZongId(e.target.value)} placeholder="e.g. ZG-123" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Ufone ID</label>
              <input className="input" value={ufoneId} onChange={e => setUfoneId(e.target.value)} placeholder="e.g. UF-123" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <button 
              type="submit" 
              className="btn-accent"
              style={{ width: '100%', padding: '12px', fontWeight: 700 }}
            >
              💾 Update Locally (This Device Only)
            </button>
            <button 
              type="button" 
              className="btn-ghost"
              style={{ 
                width: '100%', padding: '12px', fontWeight: 700, 
                border: '1px solid var(--accent)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
              onClick={(e) => {
                handleSave(e);
                const msg = encodeURIComponent(
                  `Hi HTC Admin! Requesting Global Site Update for Engro Connect:\n\n` +
                  `Site ID: ${name}\n` +
                  `Lat/Lng: ${lat}, ${lng}\n` +
                  `MBU: ${mbuNumber} (${mbuName})\n` +
                  `Cell: ${cellNumber}\n` +
                  `Portfolio: ${networkPortfolio}\n` +
                  `Zonal Manager: ${zonalManager}\n` +
                  `Status: ${siteStatus} | Category: ${category}\n` +
                  `Power: ${powerStatus} | Solar: ${solar}\n\n` +
                  `Please update in master dataset for everyone!`
                );
                window.open(`https://wa.me/923171112796?text=${msg}`, '_blank');
              }}
            >
              🌐 Update for Everyone (Submit to Admin via WhatsApp)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};



import React from 'react';
import { Map, Edit2, Trash2 } from 'lucide-react';
import type { Site } from '../types';

interface Props {
  site: Site;
  onEdit: (site: Site) => void;
  onDelete: (id: string) => void;
}

export const SiteCard: React.FC<Props> = ({ site, onEdit, onDelete }) => {
  const openInMap = () => {
    // Generate an intent for Android or standard Maps url
    window.open(`https://maps.google.com/?q=${site.lat},${site.lng}`, '_blank');
  };

  return (
    <div className="glass-panel animate-slide-up" style={{ padding: '20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{site.name}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          {site.lat.toFixed(6)}, {site.lng.toFixed(6)}
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button className="btn-icon" onClick={openInMap} style={{ flex: 1, backgroundColor: 'rgba(91, 114, 255, 0.1)', color: 'var(--accent-color)' }}>
          <Map size={18} style={{ marginRight: '8px' }} /> Map
        </button>
        <button className="btn-icon" onClick={() => onEdit(site)}>
          <Edit2 size={18} />
        </button>
        <button className="btn-icon" onClick={() => onDelete(site.id)} style={{ color: 'var(--danger-color)' }}>
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

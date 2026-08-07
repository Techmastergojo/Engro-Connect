import React, { useState } from 'react';
import { Map, Edit2, Trash2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import type { Site } from '../types';

interface Props {
  site: Site;
  onEdit: (site: Site) => void;
  onDelete: (id: string) => void;
}

export const SiteCard: React.FC<Props> = ({ site, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const openInMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://maps.google.com/?q=${site.lat},${site.lng}`, '_blank');
  };

  const openWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Clean phone number (remove spaces, dashes, leading 0 to international format if needed)
    let phone = site.cellNumber.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '92' + phone.substring(1); // Standard Pakistan country code fallback
    }
    const message = encodeURIComponent(`Hi ${site.mbuName}, regarding Site: ${site.name} (${site.mbuNumber})`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(site);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(site.id);
  };

  return (
    <div 
      className={`site-card animate-slide-up ${isExpanded ? 'expanded' : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="badge" style={{ marginBottom: '8px' }}>{site.mbuNumber || 'NO MBU'}</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{site.name}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            {site.lat.toFixed(6)}, {site.lng.toFixed(6)}
          </p>
        </div>
        <button className="btn-icon" style={{ background: 'transparent', border: 'none' }}>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {isExpanded && (
        <div className="detail-grid">
          <div className="detail-item">
            <div className="detail-label">MBU Name</div>
            <div className="detail-value">{site.mbuName || 'N/A'}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">MBU Cell Number</div>
            <div className="detail-value">{site.cellNumber || 'N/A'}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Network Portfolio</div>
            <div className="detail-value">{site.networkPortfolio || 'N/A'}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Zonal Manager</div>
            <div className="detail-value">{site.zonalManager || 'N/A'}</div>
          </div>

          <div className="detail-full" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button className="btn-map" onClick={openInMap} style={{ flex: 1 }}>
              <Map size={16} /> Locate on Map
            </button>
            {site.cellNumber && (
              <button className="btn-whatsapp" onClick={openWhatsApp} style={{ flex: 1 }}>
                <MessageSquare size={16} /> WhatsApp MBU
              </button>
            )}
            <button className="btn-icon" onClick={handleEditClick} title="Edit Site">
              <Edit2 size={16} />
            </button>
            <button className="btn-icon btn-danger" onClick={handleDeleteClick} title="Delete Site">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

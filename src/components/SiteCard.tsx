import React, { useState } from 'react';
import { Map, Edit2, Trash2, MessageSquare, ChevronDown, ChevronUp, Sun, Zap, Shield, Radio, Activity } from 'lucide-react';
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
    let phone = site.cellNumber.replace(/\D/g, '');
    if (phone.length === 10 && phone.startsWith('3')) {
      phone = '92' + phone;
    } else if (phone.startsWith('0') && phone.length === 11) {
      phone = '92' + phone.substring(1);
    } else if (!phone.startsWith('92')) {
      phone = '92' + phone;
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

  const hasSolar = site.solar && site.solar.toLowerCase() === 'yes';

  const v = (val?: string | number) => {
    if (val === undefined || val === null) return '-';
    const s = String(val).trim();
    if (s === '' || s.toLowerCase() === 'nan' || s === 'null' || s === 'undefined') return '-';
    return s;
  };

  return (
    <div 
      className={`site-card animate-slide-up ${isExpanded ? 'expanded' : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' }}>
            <span className="badge">{site.mbuNumber || 'NO MBU'}</span>
            {site.siteStatus && site.siteStatus !== '-' && (
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                {site.siteStatus}
              </span>
            )}
            {site.category && site.category !== '-' && (
              <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                {site.category}
              </span>
            )}
            {hasSolar && (
              <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Sun size={12} /> Solar
              </span>
            )}
          </div>

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
          {/* MBU & Contact */}
          <div className="detail-item">
            <div className="detail-label">MBU Name</div>
            <div className="detail-value">{v(site.mbuName)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">MBU Cell Number</div>
            <div className="detail-value">{v(site.cellNumber)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Network Portfolio</div>
            <div className="detail-value">{v(site.networkPortfolio)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Zonal Manager</div>
            <div className="detail-value">{v(site.zonalManager)}</div>
          </div>

          {/* Operational & Power Specs */}
          <div className="detail-item">
            <div className="detail-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={13} color="var(--accent)" /> Power Status
            </div>
            <div className="detail-value">{v(site.powerStatus)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={13} color="var(--accent)" /> DG Status
            </div>
            <div className="detail-value">{v(site.dgStatus)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={13} color="var(--accent)" /> Security Vendor
            </div>
            <div className="detail-value">{v(site.securityVendor)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Radio size={13} color="var(--accent)" /> Guest OMOs
            </div>
            <div className="detail-value">{v(site.guestOmo)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">DG Shared</div>
            <div className="detail-value">{v(site.dgShared)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">DC Shared</div>
            <div className="detail-value">{v(site.dcShared)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Solar Installed</div>
            <div className="detail-value">{v(site.solar)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Solar KWA</div>
            <div className="detail-value">{v(site.solarKwa)}</div>
          </div>

          {/* Tower & Site Specs */}
          <div className="detail-item">
            <div className="detail-label">Dependent Sites</div>
            <div className="detail-value">{v(site.dependentSites || site.noOfSites)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">NE Location</div>
            <div className="detail-value">{v(site.neLocation)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">DC Shared With</div>
            <div className="detail-value">{v(site.dcSharedWith)}</div>
          </div>

          {/* Operator IDs */}
          <div className="detail-item">
            <div className="detail-label">Jazz ID</div>
            <div className="detail-value">{v(site.jazzId)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Telenor ID</div>
            <div className="detail-value">{v(site.telenorId)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Zong ID</div>
            <div className="detail-value">{v(site.zongId)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Ufone ID</div>
            <div className="detail-value">{v(site.ufoneId)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">TP ID</div>
            <div className="detail-value">{v(site.tpId)}</div>
          </div>

          {/* Operator Approved Services */}
          <div className="detail-item">
            <div className="detail-label">TP Approved Services</div>
            <div className="detail-value">{v(site.tpApprovedServices)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Zong Approved Services</div>
            <div className="detail-value">{v(site.zongApprovedServices)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Ufone Approved Services</div>
            <div className="detail-value">{v(site.ufoneApprovedServices)}</div>
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


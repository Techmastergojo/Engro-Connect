import React from 'react';
import { X, Zap, Settings2, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, padding: '16px' }} onClick={onClose}>
      <div 
        className="glass modal-box" 
        style={{ 
          maxWidth: '600px', width: '100%', 
          padding: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'row',
          background: 'var(--surface)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Left Side: Video (35% width on mobile) */}
        <div style={{ 
          width: '35%', 
          minWidth: '110px', 
          position: 'relative', 
          background: '#000',
          display: 'flex'
        }}>
          <video 
            src="/changelog-v2.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
          />
          {/* Gradient fade to blend into the right side smoothly */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, var(--surface) 100%)' }} />
        </div>

        {/* Right Side: Corporate Formal Content */}
        <div style={{ 
          width: '65%', 
          padding: '24px 20px', 
          display: 'flex', flexDirection: 'column', 
          position: 'relative', overflowY: 'auto', maxHeight: '80vh'
        }}>
          <button 
            onClick={onClose} 
            style={{ 
              position: 'absolute', top: '12px', right: '12px', 
              background: 'rgba(128,128,128,0.1)', border: 'none', borderRadius: '50%',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <X size={16} />
          </button>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Release Notes V2
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.5 }}>
            Engro Enfrashare has been updated with enterprise-grade features to streamline operations.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ color: 'var(--accent)', marginTop: '2px' }}><Zap size={18} /></div>
              <div>
                <h4 style={{ fontWeight: 600, margin: '0 0 2px', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Automated Provisioning</h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.8rem', lineHeight: 1.4 }}>
                  Seamless background installation of the latest software updates via OTA deployment.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ color: 'var(--accent)', marginTop: '2px' }}><Settings2 size={18} /></div>
              <div>
                <h4 style={{ fontWeight: 600, margin: '0 0 2px', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Interface Customization</h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.8rem', lineHeight: 1.4 }}>
                  Support for comprehensive UI personalization with 10 corporate color pallets.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ color: 'var(--accent)', marginTop: '2px' }}><ShieldCheck size={18} /></div>
              <div>
                <h4 style={{ fontWeight: 600, margin: '0 0 2px', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Telemetry & Redundancy</h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.8rem', lineHeight: 1.4 }}>
                  Integrated issue reporting architecture and automated local database backups.
                </p>
              </div>
            </div>
          </div>

          <button 
            style={{ 
              marginTop: 'auto', 
              background: 'var(--accent)', color: '#fff', 
              padding: '12px', borderRadius: 'var(--radius-sm)', 
              textAlign: 'center', fontWeight: 600, fontSize: '0.9rem',
              border: 'none', cursor: 'pointer', transition: 'opacity 0.2s'
            }}
            onClick={onClose}
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

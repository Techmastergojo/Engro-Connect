import React from 'react';
import { X, Zap, Settings2, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div 
        className="glass modal-box" 
        style={{ 
          maxWidth: '440px', width: '100%', 
          padding: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'column' 
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Video Header */}
        <div style={{ position: 'relative', width: '100%', background: '#000', maxHeight: '240px', overflow: 'hidden' }}>
          <video 
            src="/changelog-v2.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
          />
          <button 
            onClick={onClose} 
            style={{ 
              position: 'absolute', top: '12px', right: '12px', 
              background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', backdropFilter: 'blur(4px)'
            }}
          >
            <X size={18} />
          </button>
          
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '24px 20px 16px',
            background: 'linear-gradient(transparent, var(--surface) 90%)'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              What's New in V2! 🚀
            </h2>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '0 20px 20px', overflowY: 'auto' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
            Welcome to the massive Engro Connect V2 update. Here is what has changed:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ color: 'var(--accent)', marginTop: '2px' }}><Zap size={20} /></div>
              <div>
                <h4 style={{ fontWeight: 700, margin: '0 0 4px', fontSize: '0.95rem' }}>Magic Auto-Updates</h4>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>
                  You will never have to install an APK again. The app now silently downloads new updates in the background!
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ color: 'var(--accent)', marginTop: '2px' }}><Settings2 size={20} /></div>
              <div>
                <h4 style={{ fontWeight: 700, margin: '0 0 4px', fontSize: '0.95rem' }}>10 New Themes</h4>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>
                  Tap the gear icon on the top right to switch between 10 beautiful color themes.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ color: 'var(--accent)', marginTop: '2px' }}><ShieldCheck size={20} /></div>
              <div>
                <h4 style={{ fontWeight: 700, margin: '0 0 4px', fontSize: '0.95rem' }}>Community Bug Reports & Backups</h4>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>
                  Report bugs directly from settings. Plus, all your custom sites now safely backup to your Downloads folder to survive uninstalls!
                </p>
              </div>
            </div>
          </div>

          <button 
            className="btn-accent" 
            style={{ width: '100%', marginTop: '24px', padding: '12px', fontSize: '1rem' }}
            onClick={onClose}
          >
            Got it, let's go!
          </button>
        </div>
      </div>
    </div>
  );
};

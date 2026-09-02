import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  Filter, 
  X, 
  ChevronRight,
  Radio
} from 'lucide-react';
import { analyticsData } from '../analyticsData';
import type { NarSite } from '../types';

export const NarDashboard: React.FC = () => {
  const [selectedMbu, setSelectedMbu] = useState<string>('ALL');
  const [siteSearch, setSiteSearch] = useState('');
  const [selectedSiteCode, setSelectedSiteCode] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const narData = analyticsData.nar;
  const mbuList = analyticsData.mbuList;
  const mbuTotals = narData.mbuTotals as Record<string, { tdtMinutes: number; tdtHours: number; tnar: number }>;
  const c4Total = narData.c4Total as { avgNar: number; totalDtHours: number; totalSites: number };

  // Currently selected site for deep dive
  const selectedSite = useMemo(() => {
    if (!selectedSiteCode) return null;
    return (narData.sites as NarSite[]).find(s => s.code.toUpperCase() === selectedSiteCode.toUpperCase()) || null;
  }, [selectedSiteCode, narData.sites]);

  // Autocomplete site search results (up to 12 matches)
  const searchResults = useMemo(() => {
    if (!siteSearch.trim()) return [];
    const q = siteSearch.trim().toLowerCase();
    return (narData.sites as NarSite[])
      .filter(s => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [siteSearch, narData.sites]);

  // Top 20 Worst Performing Sites based on selected MBU (or Whole C-4)
  const top20WorstSites = useMemo(() => {
    let list: NarSite[] = [...(narData.sites as NarSite[])];
    if (selectedMbu !== 'ALL') {
      list = list.filter(s => s.mbu.toLowerCase() === selectedMbu.toLowerCase());
    }
    return list.sort((a, b) => a.avgNar - b.avgNar).slice(0, 20);
  }, [selectedMbu, narData.sites]);

  // Sites count in active selection
  const activeSitesCount = useMemo(() => {
    if (selectedMbu === 'ALL') return (narData.sites as NarSite[]).length;
    return (narData.sites as NarSite[]).filter(s => s.mbu.toLowerCase() === selectedMbu.toLowerCase()).length;
  }, [selectedMbu, narData.sites]);

  // Official MBU contribution list sorted by NAR (highest to lowest)
  const sortedMbuContributions = useMemo(() => {
    return mbuList.map(mbu => {
      const info = mbuTotals[mbu] || { tnar: 0, tdtHours: 0, tdtMinutes: 0 };
      return {
        mbu,
        nar: info.tnar,
        dtHours: info.tdtHours,
        dtMinutes: info.tdtMinutes
      };
    }).sort((a, b) => b.nar - a.nar);
  }, [mbuList, mbuTotals]);

  // Active metrics for top cards
  const displayNar = useMemo(() => {
    if (selectedMbu === 'ALL') return c4Total.avgNar; // 98.43%
    return mbuTotals[selectedMbu]?.tnar || c4Total.avgNar;
  }, [selectedMbu, c4Total, mbuTotals]);

  const displayDtHours = useMemo(() => {
    if (selectedMbu === 'ALL') return c4Total.totalDtHours; // 54429.8 hrs
    return mbuTotals[selectedMbu]?.tdtHours || 0;
  }, [selectedMbu, c4Total, mbuTotals]);

  const getHealthColor = (nar: number) => {
    if (nar >= 99.0) return '#10b981'; // Green
    if (nar >= 98.0) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const handleSelectSite = (site: NarSite) => {
    setSelectedSiteCode(site.code);
    setSiteSearch('');
    setIsSearchFocused(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* ── HEADER WITH MBU FILTER ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge" style={{ margin: 0, padding: '4px 10px', fontSize: '0.75rem' }}>
              📊 Network Availability Rate
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              August 2026 Performance Data
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0 0', color: 'var(--text-primary)' }}>
            NAR & Outage Performance Intelligence
          </h2>
        </div>

        {/* MBU Filter Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--accent)" />
          <select
            value={selectedMbu}
            onChange={(e) => setSelectedMbu(e.target.value)}
            style={{
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="ALL">🌐 Whole C-4 Region</option>
            {mbuList.map(mbu => (
              <option key={mbu} value={mbu}>📍 {mbu}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 🔍 HIGH-ACCURACY SITE-WISE SEARCH ── */}
      <div style={{ position: 'relative', width: '100%', zIndex: 50 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--surface)',
          border: '1px solid var(--accent)',
          borderRadius: '12px',
          padding: '10px 14px',
          boxShadow: '0 4px 20px rgba(0, 168, 107, 0.15)',
          gap: '10px'
        }}>
          <Search size={18} color="var(--accent)" />
          <input
            type="text"
            placeholder="🔍 Search Site Code (e.g. HWY5602, JPJ5679) or Site Name for Outage Reasons & DT..."
            value={siteSearch}
            onChange={(e) => {
              setSiteSearch(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          />
          {siteSearch && (
            <button 
              onClick={() => { setSiteSearch(''); setIsSearchFocused(false); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isSearchFocused && searchResults.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'rgba(18, 22, 28, 0.98)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            maxHeight: '360px',
            overflowY: 'auto',
            padding: '8px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '4px 8px', fontWeight: 600 }}>
              Found {searchResults.length} matching sites (tap to inspect):
            </div>
            {searchResults.map(site => (
              <div
                key={site.code}
                onClick={() => handleSelectSite(site)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: selectedSiteCode === site.code ? 'var(--accent-bg)' : 'rgba(255,255,255,0.03)',
                  border: selectedSiteCode === site.code ? '1px solid var(--accent)' : '1px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.92rem' }}>{site.code}</span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                      {site.mbu}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {site.name}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 900, color: getHealthColor(site.avgNar) }}>
                    {site.avgNar.toFixed(2)}%
                  </span>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{site.dtHours} hrs DT</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 🌟 ACTIVE SITE INSPECTION: NAR, DT & REASONS ── */}
      {selectedSite && (
        <div className="glass" style={{
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid var(--accent)',
          background: 'linear-gradient(180deg, rgba(0, 168, 107, 0.08) 0%, rgba(18, 22, 28, 0.95) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          {/* Site Header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent)', margin: 0 }}>
                  🔍 Site Inspection
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>MBU: {selectedSite.mbu}</span>
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '6px 0 2px', color: '#fff' }}>
                {selectedSite.code} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>— {selectedSite.name}</span>
              </h3>
            </div>

            <button
              onClick={() => setSelectedSiteCode(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              <X size={14} /> Close
            </button>
          </div>

          {/* 3 Clear Metric Cards: NAR, DT, and Outage Incidents */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            {/* Site NAR */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Site NAR</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: getHealthColor(selectedSite.avgNar), margin: '6px 0 2px' }}>
                {selectedSite.avgNar.toFixed(2)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Official August Average</div>
            </div>

            {/* Total Downtime */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Downtime (DT)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b', margin: '6px 0 2px' }}>
                {selectedSite.dtHours} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>hrs</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedSite.dtMinutes.toLocaleString()} minutes</div>
            </div>

            {/* Outage Incidents */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Outage Incidents</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ef4444', margin: '6px 0 2px' }}>
                {selectedSite.outageStats ? selectedSite.outageStats.count : 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Recorded Events in August</div>
            </div>
          </div>

          {/* Dynamic Site Outage Reasons & Root Causes Bar Graph */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#ef4444" />
                  Site Outage Root Causes & Downtime Reasons
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Breakdown from Consolidated RSL August 2026
                </span>
              </div>
              {selectedSite.outageStats && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {Object.entries(selectedSite.outageStats.domains || {}).map(([dom, mins]) => (
                    <span key={dom} style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: dom.toLowerCase().includes('deodar') && !dom.toLowerCase().includes('non') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: dom.toLowerCase().includes('deodar') && !dom.toLowerCase().includes('non') ? '#10b981' : '#f87171'
                    }}>
                      {dom}: {(mins / 60).toFixed(1)} hrs
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Outage Reasons Bar Chart */}
            {!selectedSite.outageStats || Object.keys(selectedSite.outageStats.reasons || {}).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                🎉 No outage incidents recorded for this site in August 2026.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(() => {
                  const reasons = selectedSite.outageStats.reasons;
                  const entries = Object.entries(reasons);
                  const totalMins = entries.reduce((s, [, m]) => s + m, 0) || 1;
                  return entries.map(([reason, mins]) => {
                    const pct = Math.round((mins / totalMins) * 100);
                    const hrs = (mins / 60).toFixed(1);
                    return (
                      <div key={reason}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600, flex: 1, paddingRight: '12px' }}>
                            {reason}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>
                            {hrs} hrs <span style={{ color: '#ef4444' }}>({pct}%)</span>
                          </span>
                        </div>
                        <div style={{ height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                            borderRadius: '5px',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── TOP 3 SUMMARY KPI CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        
        {/* Average NAR */}
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {selectedMbu === 'ALL' ? 'Average NAR' : `${selectedMbu} NAR`}
            </span>
            <ShieldCheck size={20} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: getHealthColor(displayNar), margin: '10px 0 4px' }}>
            {displayNar.toFixed(2)}%
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {selectedMbu === 'ALL' ? 'Official Whole C-4 Contribution' : `${selectedMbu} Contribution`}
          </span>
        </div>

        {/* Total Downtime (DT) */}
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Total Downtime (DT)
            </span>
            <AlertTriangle size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '10px 0 4px' }}>
            {Math.round(displayDtHours).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 600 }}>hrs</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {Math.round(displayDtHours * 60).toLocaleString()} minutes total downtime
          </span>
        </div>

        {/* Active Sites Monitored */}
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Sites Monitored
            </span>
            <Radio size={20} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', margin: '10px 0 4px' }}>
            {activeSitesCount} <span style={{ fontSize: '1rem', fontWeight: 600 }}>sites</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {selectedMbu === 'ALL' ? 'All 8 MBUs in Cluster 4' : `Active sites in ${selectedMbu}`}
          </span>
        </div>

      </div>

      {/* ── 📊 MBU-WISE CONTRIBUTION BAR GRAPHS (DEDICATED SECTION) ── */}
      <div className="glass" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              📊 MBU-Wise Contribution Bar Graphs
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Official August 2026 NAR & Downtime per MBU from MBUWiseContribution (Tap any bar to filter 20 worst sites)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>● Optimal (≥99%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>● Moderate (98-99%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>● Critical (&lt;98%)</span>
          </div>
        </div>

        {/* Visual Bar Graph for each MBU */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {sortedMbuContributions.map((item, index) => {
            const isSelected = selectedMbu === item.mbu;
            // Visual scale: 96% is 0%, 100% is 100%
            const barPercent = Math.max(8, Math.min(100, (item.nar - 96) * 25));

            return (
              <div
                key={item.mbu}
                onClick={() => setSelectedMbu(isSelected ? 'ALL' : item.mbu)}
                style={{
                  cursor: 'pointer',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: isSelected ? 'var(--accent-bg)' : 'rgba(255,255,255,0.02)',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                  transition: 'all 0.2s'
                }}
              >
                {/* Top Label: MBU Name & NAR Value */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {index + 1}
                    </span>
                    <span style={{ fontWeight: 800, color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                      📍 {item.mbu}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Downtime: <strong style={{ color: '#fff' }}>{Math.round(item.dtHours).toLocaleString()} hrs</strong>
                    </span>
                    <span style={{ fontWeight: 900, fontSize: '1rem', color: getHealthColor(item.nar) }}>
                      {item.nar.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Progress / Column Bar Chart */}
                <div style={{ height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                  <div
                    style={{
                      width: `${barPercent}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${getHealthColor(item.nar)}88, ${getHealthColor(item.nar)})`,
                      borderRadius: '8px',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 🚨 TOP 20 WORST SITES (DYNAMIC FOR SELECTED MBU) ── */}
      <div className="glass" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.03)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} color="#ef4444" />
              🚨 Top 20 Worst Performing Sites ({selectedMbu === 'ALL' ? 'Whole C-4' : selectedMbu})
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Sites with lowest availability in August — Tap any site to view root cause outage reasons & DT
            </span>
          </div>
          <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', margin: 0 }}>
            {top20WorstSites.length} Critical Targets
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
          {top20WorstSites.map((site, rank) => {
            const isCurrent = selectedSiteCode === site.code;
            return (
              <div 
                key={site.code} 
                onClick={() => handleSelectSite(site)}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '12px 16px', 
                  background: isCurrent ? 'var(--accent-bg)' : 'var(--surface)', 
                  border: isCurrent ? '1px solid var(--accent)' : '1px solid var(--border)', 
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: rank < 3 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)',
                    color: rank < 3 ? '#ef4444' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {rank + 1}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.94rem', color: isCurrent ? 'var(--accent)' : '#fff' }}>
                        {site.code}
                      </span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                        {site.mbu}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {site.name}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ef4444' }}>
                      {site.avgNar.toFixed(2)}%
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{site.dtHours} hrs DT</span>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { ShieldCheck, TrendingUp, AlertTriangle, Search, Filter, Award } from 'lucide-react';
import { analyticsData } from '../analyticsData';
import type { NarSite } from '../types';

export const NarDashboard: React.FC = () => {
  const [selectedMbu, setSelectedMbu] = useState<string>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'daily' | 'priority' | 'sites' | 'outages'>('overview');
  const [siteSearch, setSiteSearch] = useState('');

  const narData = analyticsData.nar;
  const mbuList = analyticsData.mbuList;
  const dates = analyticsData.dates;

  // Filtered MBU Totals
  const mbuTotalsArray = useMemo(() => {
    return Object.entries(narData.mbuTotals).map(([mbu, data]) => ({
      mbu,
      tdtMinutes: (data as any).tdtMinutes,
      tnar: (data as any).tnar,
    })).sort((a, b) => b.tnar - a.tnar);
  }, [narData.mbuTotals]);

  // Daily Trend Data (Whole C4 or selected MBU)
  const dailyTrend = useMemo(() => {
    return dates.map(d => {
      const deodarDaily = narData.wholeC4.deodarDaily as Record<string, number>;
      const mbuDailyMap = narData.mbuDaily as Record<string, Record<string, number>>;
      const e2eDaily = narData.wholeC4.e2eDaily as Record<string, number>;

      const deodar = selectedMbu === 'ALL' 
        ? deodarDaily[d] || null
        : (mbuDailyMap[selectedMbu] ? mbuDailyMap[selectedMbu][d] || null : null);
      const e2e = selectedMbu === 'ALL' ? (e2eDaily[d] || null) : null;
      return { date: d, deodar, e2e };
    }).filter(x => x.deodar !== null || x.e2e !== null);
  }, [selectedMbu, dates, narData]);

  // Filtered Sites with daily NAR
  const filteredSites = useMemo(() => {
    let list: NarSite[] = narData.sites as NarSite[];
    if (selectedMbu !== 'ALL') {
      list = list.filter(s => s.mbu.toLowerCase() === selectedMbu.toLowerCase());
    }
    if (siteSearch.trim()) {
      const q = siteSearch.toLowerCase();
      list = list.filter(s => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    return list;
  }, [selectedMbu, siteSearch, narData.sites]);

  // Selected MBU or Overall stats
  const mbuTotalsMap = narData.mbuTotals as Record<string, { tdtMinutes: number; tnar: number }>;
  const currentAvgDeodar = selectedMbu === 'ALL' 
    ? narData.wholeC4.avgDeodar 
    : (mbuTotalsMap[selectedMbu]?.tnar || 0);

  const currentTdt = selectedMbu === 'ALL'
    ? Object.values(narData.mbuTotals).reduce((sum: number, x: any) => sum + (x.tdtMinutes || 0), 0)
    : (mbuTotalsMap[selectedMbu]?.tdtMinutes || 0);

  const getHealthColor = (nar: number) => {
    if (nar >= 99.0) return '#10b981'; // Green
    if (nar >= 98.0) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* Top Header & MBU Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge" style={{ margin: 0, padding: '4px 10px', fontSize: '0.75rem' }}>
              Network Availability Report
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>August 2026</span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0 0', color: 'var(--text-primary)' }}>
            NAR & Downtime Intelligence
          </h2>
        </div>

        {/* MBU Selector Dropdown */}
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

      {/* Sub-Nav Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'overview', label: '📊 Overview & KPIs' },
          { id: 'daily', label: '📅 Daily Trend' },
          { id: 'priority', label: '⭐ Elite & Platinum' },
          { id: 'sites', label: '🔍 Site Performance (' + filteredSites.length + ')' },
          { id: 'outages', label: '⚠️ Outage Categories' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              border: activeSubTab === tab.id ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: activeSubTab === tab.id ? 'var(--accent-bg)' : 'transparent',
              color: activeSubTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 1. KPI CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        
        {/* Deodar NAR Card */}
        <div className="glass" style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Deodar NAR</span>
            <ShieldCheck size={18} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: getHealthColor(currentAvgDeodar), margin: '8px 0 2px' }}>
            {currentAvgDeodar.toFixed(2)}%
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {selectedMbu === 'ALL' ? 'Whole C-4 Monthly Average' : `${selectedMbu} Month NAR`}
          </span>
        </div>

        {/* E2E / Overall Card */}
        {selectedMbu === 'ALL' && (
          <div className="glass" style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>E2E (Total NAR)</span>
              <TrendingUp size={18} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: getHealthColor(narData.wholeC4.avgE2E), margin: '8px 0 2px' }}>
              {narData.wholeC4.avgE2E.toFixed(2)}%
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Non-Deodar Inclusive
            </span>
          </div>
        )}

        {/* Total Downtime (TDT) */}
        <div className="glass" style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Downtime</span>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 2px' }}>
            {(currentTdt / 60).toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>hrs</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {Math.round(currentTdt).toLocaleString()} mins total outage
          </span>
        </div>

        {/* Best Performing MBU */}
        {selectedMbu === 'ALL' && (
          <div className="glass" style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Top Performing MBU</span>
              <Award size={18} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', margin: '8px 0 2px' }}>
              {mbuTotalsArray[0]?.mbu}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              NAR: {mbuTotalsArray[0]?.tnar.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* ── 2. VIEW CONTENT ── */}
      
      {/* TAB A: OVERVIEW & MBU LEADERBOARD */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* MBU Performance Leaderboard Table */}
          <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                📍 MBU Performance Ranking
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sorted by Total NAR</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 8px', width: '40px' }}>#</th>
                    <th style={{ padding: '10px 8px' }}>MBU Code</th>
                    <th style={{ padding: '10px 8px' }}>Total NAR</th>
                    <th style={{ padding: '10px 8px' }}>Downtime (Hrs)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mbuTotalsArray.map((row, idx) => {
                    const isSelected = selectedMbu === row.mbu;
                    return (
                      <tr 
                        key={row.mbu} 
                        onClick={() => setSelectedMbu(isSelected ? 'ALL' : row.mbu)}
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: isSelected ? 'var(--accent-bg)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {row.mbu}
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 800, color: getHealthColor(row.tnar) }}>
                          {row.tnar.toFixed(2)}%
                        </td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                          {(row.tdtMinutes / 60).toFixed(1)} hrs
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: row.tnar >= 99.0 ? 'rgba(16,185,129,0.15)' : row.tnar >= 98.0 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                            color: getHealthColor(row.tnar)
                          }}>
                            {row.tnar >= 99.0 ? 'Optimal' : row.tnar >= 98.0 ? 'Moderate' : 'Critical'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Snapshot of Priority & Daily */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            {/* Elite / Platinum Widget */}
            <div className="glass" style={{ padding: '18px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Award size={18} color="var(--accent)" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Priority Sites Health</h4>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', padding: '12px 0' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Elite Sites ({narData.elitePlatinum.elite.totalSites})</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: getHealthColor(narData.elitePlatinum.elite.nar), marginTop: '4px' }}>
                    {narData.elitePlatinum.elite.nar}%
                  </div>
                </div>
                <div style={{ width: '1px', background: 'var(--border)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Platinum Sites ({narData.elitePlatinum.platinum.totalSites})</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: getHealthColor(narData.elitePlatinum.platinum.nar), marginTop: '4px' }}>
                    {narData.elitePlatinum.platinum.nar}%
                  </div>
                </div>
              </div>
            </div>

            {/* Outage Breakdown Preview */}
            <div className="glass" style={{ padding: '18px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertTriangle size={18} color="#f59e0b" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Outage Classification</h4>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                System categorizes site faults into Deodar vs Non-Deodar vs Force-Majeure.
              </p>
              <button
                onClick={() => setActiveSubTab('outages')}
                style={{
                  background: 'var(--accent-bg)',
                  color: 'var(--accent)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                View 120+ Outage Categories →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: DAILY TREND */}
      {activeSubTab === 'daily' && (
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              📅 Daily Network Availability Timeline
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>
              {selectedMbu === 'ALL' ? 'Whole C-4 Region' : selectedMbu}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dailyTrend.map(day => {
              const val = day.deodar || day.e2e || 0;
              const barWidth = Math.max(0, Math.min(100, (val - 90) * 10)); // Scale 90%..100%
              return (
                <div key={day.date} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ width: '85px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {day.date.slice(5)}
                  </span>

                  {/* Visual Bar */}
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '10px', overflow: 'hidden', position: 'relative' }}>
                    <div 
                      style={{ 
                        width: `${barWidth}%`, 
                        height: '100%', 
                        background: getHealthColor(val),
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                      }} 
                    />
                  </div>

                  <span style={{ width: '60px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 800, color: getHealthColor(val) }}>
                    {val.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB C: ELITE & PLATINUM */}
      {activeSubTab === 'priority' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 16px', color: 'var(--text-primary)' }}>
              ⭐ High-Priority Tier Performance
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                  Elite Sites
                </span>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: getHealthColor(narData.elitePlatinum.elite.nar), margin: '12px 0 4px' }}>
                  {narData.elitePlatinum.elite.nar}%
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {narData.elitePlatinum.elite.totalSites} total critical sites monitored under Elite priority.
                </p>
              </div>

              <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
                  Platinum Sites
                </span>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: getHealthColor(narData.elitePlatinum.platinum.nar), margin: '12px 0 4px' }}>
                  {narData.elitePlatinum.platinum.nar}%
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {narData.elitePlatinum.platinum.totalSites} sites monitored under Platinum Tier.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB D: SITE NAR SEARCH & DRILLDOWN */}
      {activeSubTab === 'sites' && (
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              🔍 Site Availability Database ({filteredSites.length})
            </h3>
            
            {/* Search Input */}
            <div style={{ position: 'relative', width: '240px' }}>
              <input
                type="text"
                placeholder="Search Site Code or Name..."
                value={siteSearch}
                onChange={e => setSiteSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 12px 8px 32px',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
            {filteredSites.slice(0, 100).map(s => (
              <div 
                key={s.code} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '12px 14px', 
                  background: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '10px' 
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent)' }}>{s.code}</span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                      {s.mbu}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {s.name}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: getHealthColor(s.avgNar) }}>
                    {s.avgNar.toFixed(1)}%
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Monthly Avg</span>
                </div>
              </div>
            ))}
            {filteredSites.length > 100 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>
                Showing top 100 sites of {filteredSites.length}. Use search above to find specific sites.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB E: OUTAGE CATEGORIES */}
      {activeSubTab === 'outages' && (
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 14px' }}>
            ⚠️ Outage Fault Categorization & Domains
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
            {narData.outageCategories.map((c: any, i: number) => {
              const isDeodar = c.domain.toLowerCase().includes('deodar') && !c.domain.toLowerCase().includes('non');
              return (
                <div key={i} style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>{c.reason}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: isDeodar ? 'rgba(0,168,107,0.15)' : 'rgba(239,68,68,0.15)',
                    color: isDeodar ? '#10b981' : '#f87171'
                  }}>
                    {c.domain}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

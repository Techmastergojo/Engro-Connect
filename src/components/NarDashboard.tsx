import React, { useState, useMemo } from 'react';
import { ShieldCheck, TrendingUp, AlertTriangle, Search, Filter, Award, Clock } from 'lucide-react';
import { analyticsData } from '../analyticsData';
import type { NarSite } from '../types';

export const NarDashboard: React.FC = () => {
  const [selectedMbu, setSelectedMbu] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<'3d' | '7d' | '15d' | '1m' | '6m'>('1m');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'worst20' | 'daily' | 'priority' | 'sites' | 'outages'>('overview');
  const [siteSearch, setSiteSearch] = useState('');
  const [selectedReasonDomain, setSelectedReasonDomain] = useState<string>('ALL');

  const narData = analyticsData.nar;
  const mbuList = analyticsData.mbuList;
  const allDates = analyticsData.dates; // 27 active dates in August

  // Top 20 Worst Performing Sites (Lowest NAR in August)
  const top20WorstSites = useMemo(() => {
    let list: NarSite[] = [...(narData.sites as NarSite[])];
    if (selectedMbu !== 'ALL') {
      list = list.filter(s => s.mbu.toLowerCase() === selectedMbu.toLowerCase());
    }
    return list.sort((a, b) => a.avgNar - b.avgNar).slice(0, 20);
  }, [selectedMbu, narData.sites]);

  // Filter dates based on active time filter
  const filteredDates = useMemo(() => {
    if (timeFilter === '3d') return allDates.slice(-3);
    if (timeFilter === '7d') return allDates.slice(-7);
    if (timeFilter === '15d') return allDates.slice(-15);
    if (timeFilter === '1m') return allDates;
    return allDates; // 6m view shows August + historical projection
  }, [timeFilter, allDates]);

  // Compute MBU stats based on filtered dates
  const mbuMetrics = useMemo(() => {
    return mbuList.map(mbu => {
      const dailyMap = (narData.mbuDaily as Record<string, Record<string, number>>)[mbu] || {};
      const dtMap = (narData.mbuDailyDt as Record<string, Record<string, number>>)[mbu] || {};
      
      const narVals = filteredDates.map(d => dailyMap[d]).filter(v => typeof v === 'number');
      const avgNar = narVals.length > 0 ? (narVals.reduce((a, b) => a + b, 0) / narVals.length) : 0;
      
      const totalDtHrs = filteredDates.reduce((sum, d) => sum + (dtMap[d] || 0), 0);

      // Official sheet totals if full month is selected
      const official = (narData.mbuTotals as Record<string, { tdtMinutes: number; tnar: number }>)[mbu];
      const displayNar = timeFilter === '1m' ? (official?.tnar || avgNar) : avgNar;
      const displayDt = timeFilter === '1m' ? ((official?.tdtMinutes || 0) / 60) : totalDtHrs;

      return {
        mbu,
        nar: round(displayNar),
        dtHours: round(displayDt, 1),
        dailyMap
      };
    }).sort((a, b) => b.nar - a.nar);
  }, [mbuList, filteredDates, timeFilter, narData]);

  // Calculate Whole C4 Average for current time filter
  const wholeC4Deodar = useMemo(() => {
    const dailyMap = narData.wholeC4.deodarDaily as Record<string, number>;
    const vals = filteredDates.map(d => dailyMap[d]).filter(v => typeof v === 'number');
    if (timeFilter === '1m') return narData.wholeC4.avgDeodar;
    return vals.length > 0 ? round(vals.reduce((a, b) => a + b, 0) / vals.length) : narData.wholeC4.avgDeodar;
  }, [filteredDates, timeFilter, narData]);

  const wholeC4E2E = useMemo(() => {
    const dailyMap = narData.wholeC4.e2eDaily as Record<string, number>;
    const vals = filteredDates.map(d => dailyMap[d]).filter(v => typeof v === 'number');
    if (timeFilter === '1m') return narData.wholeC4.avgE2E;
    return vals.length > 0 ? round(vals.reduce((a, b) => a + b, 0) / vals.length) : narData.wholeC4.avgE2E;
  }, [filteredDates, timeFilter, narData]);

  const totalDowntimeHours = useMemo(() => {
    if (selectedMbu === 'ALL') {
      return round(mbuMetrics.reduce((sum, m) => sum + m.dtHours, 0), 1);
    }
    const target = mbuMetrics.find(m => m.mbu === selectedMbu);
    return target ? target.dtHours : 0;
  }, [mbuMetrics, selectedMbu]);

  // Daily Trend Data for selected MBU or Whole C4
  const dailyTrend = useMemo(() => {
    return filteredDates.map(d => {
      const deodarDaily = narData.wholeC4.deodarDaily as Record<string, number>;
      const mbuDailyMap = narData.mbuDaily as Record<string, Record<string, number>>;
      const e2eDaily = narData.wholeC4.e2eDaily as Record<string, number>;

      const deodar = selectedMbu === 'ALL' 
        ? deodarDaily[d] || null
        : (mbuDailyMap[selectedMbu] ? mbuDailyMap[selectedMbu][d] || null : null);
      const e2e = selectedMbu === 'ALL' ? (e2eDaily[d] || null) : null;
      return { date: d, deodar, e2e };
    });
  }, [selectedMbu, filteredDates, narData]);

  // Filtered Sites
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

  // Filtered Outage Categories from sheet
  const filteredOutages = useMemo(() => {
    if (selectedReasonDomain === 'ALL') return narData.outageCategories;
    return narData.outageCategories.filter((c: any) => c.domain.toLowerCase() === selectedReasonDomain.toLowerCase());
  }, [selectedReasonDomain, narData.outageCategories]);

  function round(val: number, decimals = 2): number {
    return Number(Math.round(Number(val + 'e' + decimals)) + 'e-' + decimals);
  }

  const getHealthColor = (nar: number) => {
    if (nar >= 99.0) return '#10b981'; // Green
    if (nar >= 98.0) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* Top Header with MBU & Time Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge" style={{ margin: 0, padding: '4px 10px', fontSize: '0.75rem' }}>
              📊 Network Availability Rate
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {timeFilter === '3d' ? 'Last 3 Days' : timeFilter === '7d' ? 'Last 7 Days' : timeFilter === '15d' ? 'Last 15 Days' : timeFilter === '6m' ? '6 Months Historical' : 'August 2026 (Month)'}
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0 0', color: 'var(--text-primary)' }}>
            NAR Performance Intelligence
          </h2>
        </div>

        {/* Filters: MBU Selector */}
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

      {/* ── ADVANCED TIME FILTER BAR ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '6px 10px',
        overflowX: 'auto',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
          <Clock size={14} color="var(--accent)" />
          <span>Time Horizon:</span>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { id: '3d', label: '3 Days' },
            { id: '7d', label: '7 Days' },
            { id: '15d', label: '15 Days' },
            { id: '1m', label: '1 Month' },
            { id: '6m', label: '6 Months' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTimeFilter(t.id as any)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: timeFilter === t.id ? 'var(--accent)' : 'transparent',
                color: timeFilter === t.id ? '#fff' : 'var(--text-secondary)'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Nav Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'overview', label: '📊 Overview & Charts' },
          { id: 'worst20', label: '🚨 Top 20 Worst Sites (' + top20WorstSites.length + ')' },
          { id: 'daily', label: '📅 Daily Trend (' + filteredDates.length + ' days)' },
          { id: 'priority', label: '⭐ Elite & Platinum' },
          { id: 'sites', label: '🔍 Site Performance (' + filteredSites.length + ')' },
          { id: 'outages', label: '⚠️ Outage Reasons (' + filteredOutages.length + ')' },
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

      {/* ── KPI STATS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        
        {/* Deodar NAR */}
        <div className="glass" style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Deodar NAR</span>
            <ShieldCheck size={18} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: getHealthColor(selectedMbu === 'ALL' ? wholeC4Deodar : (mbuMetrics.find(m => m.mbu === selectedMbu)?.nar || 0)), margin: '8px 0 2px' }}>
            {(selectedMbu === 'ALL' ? wholeC4Deodar : (mbuMetrics.find(m => m.mbu === selectedMbu)?.nar || 0)).toFixed(2)}%
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {selectedMbu === 'ALL' ? 'Whole C-4 Average' : `${selectedMbu} Average`}
          </span>
        </div>

        {/* E2E / Overall Total NAR */}
        {selectedMbu === 'ALL' && (
          <div className="glass" style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>E2E NAR (Total)</span>
              <TrendingUp size={18} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: getHealthColor(wholeC4E2E), margin: '8px 0 2px' }}>
              {wholeC4E2E.toFixed(2)}%
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Non-Deodar Inclusive
            </span>
          </div>
        )}

        {/* Total Downtime */}
        <div className="glass" style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Downtime</span>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 2px' }}>
            {totalDowntimeHours.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>hrs</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {Math.round(totalDowntimeHours * 60).toLocaleString()} mins total outage
          </span>
        </div>

        {/* Top Performing MBU */}
        {selectedMbu === 'ALL' && (
          <div className="glass" style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Top Performing MBU</span>
              <Award size={18} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', margin: '8px 0 2px' }}>
              {mbuMetrics[0]?.mbu}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              NAR: {mbuMetrics[0]?.nar.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* ── SUB-TAB 1: OVERVIEW & BAR GRAPH OF MBU TRENDS ── */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 📊 BAR GRAPH: MBU-WISE NAR COMPARISON */}
          <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  📊 MBU Performance Bar Graph
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Visual comparison of NAR across all 8 MBUs (Tap any bar to filter)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>● Optimal (≥99%)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>● Moderate (98-99%)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>● Critical (&lt;98%)</span>
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {mbuMetrics.map(item => {
                const isSelected = selectedMbu === item.mbu;
                // Scale bar: 95% is 0%, 100% is 100%
                const barPercent = Math.max(5, Math.min(100, (item.nar - 95) * 20));
                
                return (
                  <div 
                    key={item.mbu} 
                    onClick={() => setSelectedMbu(isSelected ? 'ALL' : item.mbu)}
                    style={{ 
                      cursor: 'pointer',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: isSelected ? 'var(--accent-bg)' : 'transparent',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                      <span style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                        📍 {item.mbu}
                      </span>
                      <span style={{ fontWeight: 800, color: getHealthColor(item.nar) }}>
                        {item.nar.toFixed(2)}% <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>({item.dtHours} hrs DT)</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                      <div 
                        style={{ 
                          width: `${barPercent}%`, 
                          height: '100%', 
                          background: `linear-gradient(90deg, ${getHealthColor(item.nar)}aa, ${getHealthColor(item.nar)})`,
                          borderRadius: '6px',
                          transition: 'width 0.4s ease'
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MBU Ranking Leaderboard Table */}
          <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                🏆 Official MBU Leaderboard
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From Excel Sheet Data</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 8px', width: '40px' }}>#</th>
                    <th style={{ padding: '10px 8px' }}>MBU Code</th>
                    <th style={{ padding: '10px 8px' }}>Total NAR</th>
                    <th style={{ padding: '10px 8px' }}>Downtime (Hrs)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Health Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mbuMetrics.map((row, idx) => (
                    <tr 
                      key={row.mbu} 
                      onClick={() => setSelectedMbu(selectedMbu === row.mbu ? 'ALL' : row.mbu)}
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: selectedMbu === row.mbu ? 'var(--accent-bg)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 8px', fontWeight: 700, color: selectedMbu === row.mbu ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {row.mbu}
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 800, color: getHealthColor(row.nar) }}>
                        {row.nar.toFixed(2)}%
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                        {row.dtHours.toLocaleString()} hrs
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: row.nar >= 99.0 ? 'rgba(16,185,129,0.15)' : row.nar >= 98.0 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                          color: getHealthColor(row.nar)
                        }}>
                          {row.nar >= 99.0 ? 'Optimal' : row.nar >= 98.0 ? 'Moderate' : 'Critical'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🚨 TOP 20 WORST PERFORMING SITES LIST */}
          <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#ef4444" />
                  🚨 Top 20 Worst Performing Sites ({selectedMbu === 'ALL' ? 'Whole C-4' : selectedMbu})
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Sites with lowest availability in August requiring immediate field attention
                </span>
              </div>
              <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', margin: 0 }}>
                Critical Outages
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {top20WorstSites.map((site, rank) => (
                <div 
                  key={site.code} 
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: rank < 3 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)',
                      color: rank < 3 ? '#ef4444' : 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {rank + 1}
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff' }}>{site.code}</span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                          {site.mbu}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {site.name}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ef4444' }}>
                      {site.avgNar.toFixed(1)}%
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#f87171' }}>Critical NAR</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── SUB-TAB: DEDICATED TOP 20 WORST SITES ── */}
      {activeSubTab === 'worst20' && (
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color="#ef4444" />
                🚨 Top 20 Worst Performing Sites in Cluster 4
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Prioritized targets for FLM maintenance and genset restoration
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Showing lowest 20 of {narData.sites.length} sites
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {top20WorstSites.map((site, rank) => (
              <div 
                key={site.code} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '14px 16px', 
                  background: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: rank < 3 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                    color: rank < 3 ? '#ef4444' : 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    #{rank + 1}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#fff' }}>{site.code}</span>
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--accent)' }}>
                        {site.mbu}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      {site.name}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444' }}>
                    {site.avgNar.toFixed(1)}%
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600 }}>Month Average</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 2: DAILY TIMELINE ── */}
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

                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
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

      {/* ── SUB-TAB 3: ELITE & PLATINUM ── */}
      {activeSubTab === 'priority' && (
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
                {narData.elitePlatinum.elite.totalSites} total critical sites monitored under Elite priority tier.
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
      )}

      {/* ── SUB-TAB 4: SITES SEARCH ── */}
      {activeSubTab === 'sites' && (
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              🔍 Site Availability Database ({filteredSites.length})
            </h3>
            
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
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Month Average</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 5: OUTAGE REASONS FROM SHEET ── */}
      {activeSubTab === 'outages' && (
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                ⚠️ Outage Fault Reasons from Performance Sheet
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Official taxonomy of telecom and power outage reasons
              </span>
            </div>

            {/* Domain Filter */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'Deodar', 'Non-Deodar', 'Force-Majure-Deodar'].map(domain => (
                <button
                  key={domain}
                  onClick={() => setSelectedReasonDomain(domain)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: selectedReasonDomain === domain ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: selectedReasonDomain === domain ? 'var(--accent)' : 'transparent',
                    color: selectedReasonDomain === domain ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  {domain === 'ALL' ? 'All Reasons' : domain}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
            {filteredOutages.map((c: any, i: number) => {
              const isDeodar = c.domain.toLowerCase() === 'deodar';
              const isForce = c.domain.toLowerCase().includes('force');
              return (
                <div key={i} style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>{c.reason}</span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: isDeodar ? 'rgba(0,168,107,0.15)' : isForce ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                    color: isDeodar ? '#10b981' : isForce ? '#f59e0b' : '#f87171',
                    whiteSpace: 'nowrap'
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

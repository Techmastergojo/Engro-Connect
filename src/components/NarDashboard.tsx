import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  Filter, 
  Clock, 
  X, 
  Activity, 
  BarChart2, 
  ChevronRight
} from 'lucide-react';
import { analyticsData } from '../analyticsData';
import type { NarSite } from '../types';

export const NarDashboard: React.FC = () => {
  const [selectedMbu, setSelectedMbu] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<'3d' | '7d' | '15d' | '1m' | '6m'>('1m');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'worst20' | 'siteDeepDive' | 'daily' | 'priority' | 'outages'>('overview');
  
  // Site search state
  const [siteSearch, setSiteSearch] = useState('');
  const [selectedSiteCode, setSelectedSiteCode] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedReasonDomain, setSelectedReasonDomain] = useState<string>('ALL');

  const narData = analyticsData.nar;
  const mbuList = analyticsData.mbuList;
  const allDates = analyticsData.dates; // 31 active dates in August 2026

  // Find currently selected site
  const selectedSite = useMemo(() => {
    if (!selectedSiteCode) return null;
    return (narData.sites as NarSite[]).find(s => s.code.toUpperCase() === selectedSiteCode.toUpperCase()) || null;
  }, [selectedSiteCode, narData.sites]);

  // Top 20 Worst Performing Sites (Lowest NAR in August) based on selected MBU
  const top20WorstSites = useMemo(() => {
    let list: NarSite[] = [...(narData.sites as NarSite[])];
    if (selectedMbu !== 'ALL') {
      list = list.filter(s => s.mbu.toLowerCase() === selectedMbu.toLowerCase());
    }
    return list.sort((a, b) => (a.avgNar ?? 100) - (b.avgNar ?? 100)).slice(0, 20);
  }, [selectedMbu, narData.sites]);

  // Autocomplete search results (up to 12 matches)
  const searchResults = useMemo(() => {
    if (!siteSearch.trim()) return [];
    const q = siteSearch.trim().toLowerCase();
    return (narData.sites as NarSite[])
      .filter(s => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [siteSearch, narData.sites]);

  // Filter dates based on active time filter
  const filteredDates = useMemo(() => {
    if (timeFilter === '3d') return allDates.slice(-3);
    if (timeFilter === '7d') return allDates.slice(-7);
    if (timeFilter === '15d') return allDates.slice(-15);
    return allDates;
  }, [timeFilter, allDates]);

  // Compute MBU stats based on filtered dates & official MBUWiseContribution totals
  const mbuMetrics = useMemo(() => {
    return mbuList.map(mbu => {
      const dailyMap = (narData.mbuDaily as Record<string, Record<string, number>>)[mbu] || {};
      const dtMap = (narData.mbuDailyDt as Record<string, Record<string, number>>)[mbu] || {};
      
      const narVals = filteredDates.map(d => dailyMap[d]).filter(v => typeof v === 'number');
      const avgNar = narVals.length > 0 ? (narVals.reduce((a, b) => a + b, 0) / narVals.length) : 0;
      const totalDtHrs = filteredDates.reduce((sum, d) => sum + (dtMap[d] || 0), 0);

      // Official MBUWiseContribution totals if 1m / full month is selected
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

  // Filtered Outage Categories from sheet
  const filteredOutages = useMemo(() => {
    if (selectedReasonDomain === 'ALL') return narData.outageCategories;
    return narData.outageCategories.filter((c: any) => c.domain.toLowerCase() === selectedReasonDomain.toLowerCase());
  }, [selectedReasonDomain, narData.outageCategories]);

  // Get active outage reasons for selected site based on time filter
  const activeSiteOutageReasons = useMemo(() => {
    if (!selectedSite || !selectedSite.outageStats) return {};
    const stats = selectedSite.outageStats;
    if (timeFilter === '3d') return stats.reasons3d || {};
    if (timeFilter === '7d') return stats.reasons7d || {};
    if (timeFilter === '15d') return stats.reasons15d || {};
    return stats.reasons30d || {};
  }, [selectedSite, timeFilter]);

  function round(val: number, decimals = 2): number {
    return Number(Math.round(Number(val + 'e' + decimals)) + 'e-' + decimals);
  }

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
      
      {/* ── TOP HEADER WITH MBU & TIME FILTERS ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge" style={{ margin: 0, padding: '4px 10px', fontSize: '0.75rem' }}>
              📊 Network Availability Rate
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {timeFilter === '3d' ? 'Last 3 Days' : timeFilter === '7d' ? 'Last 7 Days' : timeFilter === '15d' ? 'Last 15 Days' : timeFilter === '6m' ? '6 Months Trend' : 'August 2026 (Month)'}
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

      {/* ── 🔍 HIGH-ACCURACY SITE-WISE SEARCH BAR ── */}
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
            placeholder="🔍 Site-Wise Search: Enter Site Code (e.g. HWY5602, JPJ5679) or Site Name..."
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
                  <span style={{ fontSize: '0.95rem', fontWeight: 900, color: getHealthColor(site.totalNar || site.avgNar) }}>
                    {(site.totalNar || site.avgNar).toFixed(1)}%
                  </span>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Month NAR</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 🌟 DEDICATED SELECTED SITE DEEP-DIVE SECTION ── */}
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
                  🔍 Active Site Inspection
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
              <X size={14} /> Clear Site
            </button>
          </div>

          {/* 5 Multi-Period KPI Cards: 3d, 7d, 15d, 30d, 6m */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Multi-Period Availability Overview
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              {[
                { label: '3-Day NAR', val: selectedSite.nar3d, desc: 'Aug 29–31' },
                { label: '7-Day NAR', val: selectedSite.nar7d, desc: 'Aug 25–31' },
                { label: '15-Day NAR', val: selectedSite.nar15d, desc: 'Aug 17–31' },
                { label: '30-Day (Aug) NAR', val: selectedSite.totalNar || selectedSite.nar30d || selectedSite.avgNar, desc: 'Total Month' },
                { label: '6-Month Trend', val: selectedSite.nar6m, desc: 'Jan – Aug 2026' }
              ].map(kpi => {
                const num = typeof kpi.val === 'number' ? kpi.val : 100;
                return (
                  <div
                    key={kpi.label}
                    style={{
                      padding: '14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {kpi.label}
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: getHealthColor(num), margin: '6px 0 2px' }}>
                      {num.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {kpi.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Outage Reason Graph & Domains */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            
            {/* Outage Reasons Chart */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} color="#ef4444" />
                    Site Outage Reasons ({timeFilter === '1m' ? 'August' : timeFilter.toUpperCase()})
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Downtime causes from Consolidated RSL
                  </span>
                </div>
                {selectedSite.outageStats && (
                  <span className="badge" style={{ margin: 0, fontSize: '0.7rem' }}>
                    {selectedSite.outageStats.count} Incidents
                  </span>
                )}
              </div>

              {/* Reason Bars */}
              {Object.keys(activeSiteOutageReasons).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  🎉 No recorded outage reasons for this site in the selected time window.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(() => {
                    const entries = Object.entries(activeSiteOutageReasons);
                    const totalMins = entries.reduce((s, [, m]) => s + m, 0) || 1;
                    return entries.map(([reason, mins]) => {
                      const pct = Math.round((mins / totalMins) * 100);
                      const hrs = (mins / 60).toFixed(1);
                      return (
                        <div key={reason}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600, flex: 1, paddingRight: '8px' }}>
                              {reason}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>
                              {hrs} hrs <span style={{ color: '#ef4444' }}>({pct}%)</span>
                            </span>
                          </div>
                          <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                              borderRadius: '4px',
                              transition: 'width 0.3s'
                            }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* 6-Month Historical NAR Monthly Breakdown */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BarChart2 size={16} color="var(--accent)" />
                    6-Month NAR History (4G Counter)
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Monthly performance progression
                  </span>
                </div>
              </div>

              {selectedSite.history6m ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(selectedSite.history6m).map(([month, val]) => {
                    const barW = Math.max(5, Math.min(100, (val - 85) * 6.6));
                    return (
                      <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '40px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {month}
                        </span>
                        <div style={{ flex: 1, height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${barW}%`,
                            height: '100%',
                            background: getHealthColor(val),
                            borderRadius: '4px',
                            transition: 'width 0.3s'
                          }} />
                        </div>
                        <span style={{ width: '56px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 800, color: getHealthColor(val) }}>
                          {val.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>
                  No historical 4G data available for this site code.
                </div>
              )}
            </div>

          </div>

          {/* Daily Timeline for this Site */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              📅 Daily August Availability Sparkline ({Object.keys(selectedSite.daily || {}).length} Days)
            </div>
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '6px' }}>
              {allDates.map(d => {
                const val = selectedSite.daily?.[d] ?? 100;
                const h = Math.max(12, Math.min(48, Math.round((val - 80) * 2.4)));
                return (
                  <div 
                    key={d} 
                    title={`${d}: ${val.toFixed(1)}%`}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      minWidth: '22px',
                      gap: '4px' 
                    }}
                  >
                    <div style={{ height: '50px', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{
                        width: '16px',
                        height: `${h}px`,
                        background: getHealthColor(val),
                        borderRadius: '3px'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      {d.slice(8)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

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
          { id: 'worst20', label: '🚨 20 Worst Sites (' + top20WorstSites.length + ')' },
          { id: 'daily', label: '📅 Daily Trend (' + filteredDates.length + ' days)' },
          { id: 'priority', label: '⭐ Elite & Platinum' },
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
            {selectedMbu === 'ALL' ? 'Whole C-4 Average' : `${selectedMbu} Official`}
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
              <Activity size={18} color="#10b981" />
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

      {/* ── SUB-TAB 1: OVERVIEW & 20 WORST SITES ── */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 📊 BAR GRAPH: MBU-WISE NAR COMPARISON */}
          <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  📊 MBU Performance Comparison
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Tap any MBU to filter and view its 20 worst sites
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>● Optimal (≥99%)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>● Moderate (98-99%)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>● Critical (&lt;98%)</span>
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {mbuMetrics.map(item => {
                const isSelected = selectedMbu === item.mbu;
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

          {/* 🚨 TOP 20 WORST PERFORMING SITES LIST (DYNAMIC FOR SELECTED MBU) */}
          <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#ef4444" />
                  🚨 Top 20 Worst Performing Sites ({selectedMbu === 'ALL' ? 'Whole C-4' : selectedMbu})
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Sites with lowest availability in August — Tap any site for deep outage analysis
                </span>
              </div>
              <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', margin: 0 }}>
                {top20WorstSites.length} Critical Targets
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '460px', overflowY: 'auto' }}>
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
                      padding: '12px 14px', 
                      background: isCurrent ? 'var(--accent-bg)' : 'var(--surface)', 
                      border: isCurrent ? '1px solid var(--accent)' : '1px solid var(--border)', 
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: rank < 3 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)',
                        color: rank < 3 ? '#ef4444' : 'var(--text-muted)',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {rank + 1}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isCurrent ? 'var(--accent)' : '#fff' }}>
                            {site.code}
                          </span>
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                            {site.mbu}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {site.name}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ef4444' }}>
                          {(site.totalNar || site.avgNar).toFixed(1)}%
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#f87171' }}>Tap to Inspect</span>
                      </div>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ── SUB-TAB: DEDICATED TOP 20 WORST SITES FULL VIEW ── */}
      {activeSubTab === 'worst20' && (
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color="#ef4444" />
                🚨 20 Worst Performing Sites ({selectedMbu === 'ALL' ? 'Whole C-4' : selectedMbu})
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Prioritized targets for FLM maintenance and genset restoration (Tap any site to analyze)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {top20WorstSites.map((site, rank) => (
              <div 
                key={site.code} 
                onClick={() => handleSelectSite(site)}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '14px 16px', 
                  background: selectedSiteCode === site.code ? 'var(--accent-bg)' : 'var(--surface)', 
                  border: selectedSiteCode === site.code ? '1px solid var(--accent)' : '1px solid var(--border)', 
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444' }}>
                      {(site.totalNar || site.avgNar).toFixed(1)}%
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600 }}>Month Total</span>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
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
              const barWidth = Math.max(0, Math.min(100, (val - 90) * 10));
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

      {/* ── SUB-TAB 4: OUTAGE REASONS TAXONOMY ── */}
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

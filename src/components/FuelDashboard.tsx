import React, { useState, useMemo } from 'react';
import { Fuel, Layers, Search, Filter, Droplet, CreditCard, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { analyticsData } from '../analyticsData';
import type { PouringLog, ScratchingLog, VehicleFuel, SiteDgProfile, SiteFuelSummary } from '../types';

export const FuelDashboard: React.FC = () => {
  const [selectedMbu, setSelectedMbu] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<'3d' | '7d' | '15d' | '1m' | '6m'>('1m');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'siteSearch' | 'mbu' | 'vehicles' | 'pouring' | 'cards' | 'dgProfiles'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSiteCode, setExpandedSiteCode] = useState<string | null>(null);

  const fuelData = analyticsData.fuel;
  const mbuList = analyticsData.mbuList;
  const allDailySummaries = fuelData.summaryDaily; // 31 days

  // Filter daily summaries by time horizon
  const filteredSummaries = useMemo(() => {
    if (timeFilter === '3d') return allDailySummaries.slice(-3);
    if (timeFilter === '7d') return allDailySummaries.slice(-7);
    if (timeFilter === '15d') return allDailySummaries.slice(-15);
    return allDailySummaries;
  }, [timeFilter, allDailySummaries]);

  // Compute Scratched & Poured based on time filter
  const currentScratched = useMemo(() => {
    return filteredSummaries.reduce((sum, d) => sum + d.scratching, 0);
  }, [filteredSummaries]);

  const currentPoured = useMemo(() => {
    if (selectedMbu === 'ALL') {
      return filteredSummaries.reduce((sum, d) => sum + d.pouring, 0);
    }
    // Sum for selected MBU across filtered dates
    const dateSet = new Set(filteredSummaries.map(d => d.date));
    let total = 0;
    fuelData.mbuDaily.forEach(row => {
      if (dateSet.has(row.date)) {
        total += (row as Record<string, any>)[selectedMbu] || 0;
      }
    });
    return total;
  }, [filteredSummaries, selectedMbu, fuelData.mbuDaily]);

  // Calculate MBU Pouring Totals for time filter
  const mbuPouringTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    mbuList.forEach(m => totals[m] = 0);
    const dateSet = new Set(filteredSummaries.map(d => d.date));

    fuelData.mbuDaily.forEach(row => {
      if (dateSet.has(row.date)) {
        const rowMap = row as Record<string, any>;
        mbuList.forEach(m => {
          if (rowMap[m]) totals[m] += rowMap[m];
        });
      }
    });

    return Object.entries(totals).map(([mbu, liters]) => ({
      mbu,
      liters: Math.round(liters),
    })).sort((a, b) => b.liters - a.liters);
  }, [fuelData.mbuDaily, mbuList, filteredSummaries]);

  // Filtered Site Fuel Summaries (For Site-Wise Fuel Search Explorer)
  const filteredSiteFuelList = useMemo(() => {
    let list: SiteFuelSummary[] = fuelData.siteFuelList as SiteFuelSummary[];
    if (selectedMbu !== 'ALL') {
      list = list.filter(s => s.mbu.toLowerCase().includes(selectedMbu.toLowerCase().replace('c4-', 'c3-')) || s.mbu.toLowerCase().includes(selectedMbu.toLowerCase()));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => 
        s.siteCode.toLowerCase().includes(q) || 
        s.siteName.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.totalPoured - a.totalPoured);
  }, [selectedMbu, searchQuery, fuelData.siteFuelList]);

  // Pouring Logs for a specific site
  const getSitePouringLogs = (siteCode: string) => {
    return (fuelData.pouringLogs as PouringLog[]).filter(p => p.siteCode.toLowerCase() === siteCode.toLowerCase());
  };

  // Filtered Pouring Logs
  const filteredPouringLogs = useMemo(() => {
    let list: PouringLog[] = fuelData.pouringLogs as PouringLog[];
    if (selectedMbu !== 'ALL') {
      list = list.filter(p => p.mbu.toLowerCase() === selectedMbu.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.siteCode.toLowerCase().includes(q) || 
        p.siteName.toLowerCase().includes(q) ||
        p.vehicleNo.toLowerCase().includes(q) ||
        p.createdBy.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedMbu, searchQuery, fuelData.pouringLogs]);

  // Filtered Vehicles
  const filteredVehicles = useMemo(() => {
    let list: VehicleFuel[] = fuelData.vehicles as VehicleFuel[];
    if (selectedMbu !== 'ALL') {
      list = list.filter(v => v.mbu.toLowerCase().includes(selectedMbu.toLowerCase()));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(v => 
        v.vehicleNo.toLowerCase().includes(q) || 
        v.fsoName.toLowerCase().includes(q) ||
        v.area.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.totalFuel - a.totalFuel);
  }, [selectedMbu, searchQuery, fuelData.vehicles]);

  // Filtered Scratching Cards
  const filteredScratching = useMemo(() => {
    let list: ScratchingLog[] = fuelData.scratchingLogs as ScratchingLog[];
    if (selectedMbu !== 'ALL') {
      list = list.filter(s => s.mbu.toLowerCase() === selectedMbu.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => 
        s.cardCode.toLowerCase().includes(q) || 
        s.cardNumber.toLowerCase().includes(q) ||
        s.station.toLowerCase().includes(q) ||
        s.vendor.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedMbu, searchQuery, fuelData.scratchingLogs]);

  // Filtered DG Profiles
  const filteredDgProfiles = useMemo(() => {
    let list: SiteDgProfile[] = fuelData.siteDgProfiles as SiteDgProfile[];
    if (selectedMbu !== 'ALL') {
      list = list.filter(s => s.mbu.toLowerCase().includes(selectedMbu.toLowerCase().replace('c4-', 'c3-')) || s.mbu.toLowerCase().includes(selectedMbu.toLowerCase()));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => 
        s.siteCode.toLowerCase().includes(q) || 
        s.siteName.toLowerCase().includes(q) ||
        s.dgBrand.toLowerCase().includes(q) ||
        s.engineBrand.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedMbu, searchQuery, fuelData.siteDgProfiles]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge" style={{ margin: 0, padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
              ⛽ Deodar Fuel Activity
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {timeFilter === '3d' ? 'Last 3 Days' : timeFilter === '7d' ? 'Last 7 Days' : timeFilter === '15d' ? 'Last 15 Days' : timeFilter === '6m' ? '6 Months View' : 'August 2026'}
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0 0', color: 'var(--text-primary)' }}>
            Fuel Consumption & Site Logistics
          </h2>
        </div>

        {/* MBU Filter Dropdown */}
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

      {/* ── TIME HORIZON FILTER ── */}
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
          <span>Time Range:</span>
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

      {/* Sub-Nav Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'overview', label: '📊 Overview & MBU Chart' },
          { id: 'siteSearch', label: '🔍 Site-Wise Fuel & DG (' + filteredSiteFuelList.length + ')' },
          { id: 'mbu', label: '📍 MBU Pouring Matrix' },
          { id: 'vehicles', label: '🚚 Vehicle & FSO (' + filteredVehicles.length + ')' },
          { id: 'pouring', label: '⛽ Pouring Logs (' + filteredPouringLogs.length + ')' },
          { id: 'cards', label: '💳 Fuel Cards (' + filteredScratching.length + ')' },
          { id: 'dgProfiles', label: '⚡ DG Specs (' + filteredDgProfiles.length + ')' },
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

      {/* ── KPI METRIC CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        
        {/* Total Scratched */}
        <div className="glass" style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Scratched</span>
            <CreditCard size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#3b82f6', margin: '8px 0 2px' }}>
            {currentScratched.toLocaleString()} <span style={{ fontSize: '0.85rem' }}>L</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PSO Fuel Cards Draw</span>
        </div>

        {/* Total Poured */}
        <div className="glass" style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Poured</span>
            <Droplet size={18} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--accent)', margin: '8px 0 2px' }}>
            {currentPoured.toLocaleString()} <span style={{ fontSize: '0.85rem' }}>L</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {selectedMbu === 'ALL' ? 'Into BTS Gensets' : `${selectedMbu} Poured`}
          </span>
        </div>

        {/* Net In-Hand Delta */}
        {selectedMbu === 'ALL' && (
          <div className="glass" style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Net In-Hand</span>
              <Layers size={18} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#10b981', margin: '8px 0 2px' }}>
              {Math.max(0, currentScratched - currentPoured).toLocaleString()} <span style={{ fontSize: '0.85rem' }}>L</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Unpoured Balance</span>
          </div>
        )}

        {/* Total Pouring Activities */}
        <div className="glass" style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Pouring Logs</span>
            <Fuel size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 2px' }}>
            {filteredPouringLogs.length.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Site Visits Recorded</span>
        </div>
      </div>

      {/* ── SUB-TAB: SITE-WISE FUEL & DG EXPLORER (Requested by User) ── */}
      {activeSubTab === 'siteSearch' && (
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                🔍 Site-Wise Fuel & DG Explorer ({filteredSiteFuelList.length})
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Search any site to see its total fuel poured, visit logs, and DG generator specs
              </span>
            </div>
            
            {/* Search Input */}
            <div style={{ position: 'relative', width: '240px' }}>
              <input
                type="text"
                placeholder="Search Site Code or Name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 12px 8px 30px',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
            {filteredSiteFuelList.slice(0, 100).map(s => {
              const isExpanded = expandedSiteCode === s.siteCode;
              const logs = isExpanded ? getSitePouringLogs(s.siteCode) : [];
              const dg = s.dgProfile;

              return (
                <div 
                  key={s.siteCode} 
                  style={{ 
                    background: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '12px',
                    padding: '16px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--accent)' }}>{s.siteCode}</span>
                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                          {s.mbu}
                        </span>
                        {dg?.dgKva && (
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(0,168,107,0.15)', color: 'var(--accent)', borderRadius: '4px', fontWeight: 700 }}>
                            ⚡ {dg.dgKva} KVA
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 600 }}>
                        {s.siteName}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent)' }}>
                        {s.totalPoured.toLocaleString()} <span style={{ fontSize: '0.8rem' }}>L</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {s.visitsCount} visit{s.visitsCount === 1 ? '' : 's'} logged
                      </span>
                    </div>
                  </div>

                  {/* DG Specs Grid */}
                  {dg && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginTop: '12px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.75rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Engine: </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{dg.engineBrand || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>DG Brand: </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{dg.dgBrand || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Rate: </span>
                        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{dg.consumptionFactor ? `${dg.consumptionFactor} L/hr` : 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>FLM Vendor: </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{dg.flmVendor || 'N/A'}</span>
                      </div>
                    </div>
                  )}

                  {/* Toggle Pouring History Button */}
                  <button
                    onClick={() => setExpandedSiteCode(isExpanded ? null : s.siteCode)}
                    style={{
                      marginTop: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {isExpanded ? 'Hide Pouring History' : `View ${s.visitsCount} Pouring Record${s.visitsCount === 1 ? '' : 's'}`}
                  </button>

                  {/* Expandable Pouring History Timeline */}
                  {isExpanded && (
                    <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {logs.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>No direct pouring logs recorded in August.</p>
                      ) : (
                        logs.map((log, lIdx) => (
                          <div key={lIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.78rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{log.date}</span>
                                <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '3px', background: log.visitNature === 'Emergency' ? 'rgba(239,68,68,0.15)' : 'rgba(0,168,107,0.15)', color: log.visitNature === 'Emergency' ? '#f87171' : '#10b981', fontWeight: 700 }}>
                                  {log.visitNature}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Veh: {log.vehicleNo || 'N/A'} • Logged by: {log.createdBy || 'Staff'}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: 'var(--accent)' }}>+{log.fuelPoured} L</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Bal: {log.fuelBal} L</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 1: OVERVIEW & MBU RANKING ── */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* MBU Pouring Ranking Table */}
          <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                📍 MBU Fuel Pouring Distribution
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sorted by Volume Poured</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 8px' }}>#</th>
                    <th style={{ padding: '10px 8px' }}>MBU Name</th>
                    <th style={{ padding: '10px 8px' }}>Poured Liters</th>
                    <th style={{ padding: '10px 8px' }}>% of C-4 Total</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Daily Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {mbuPouringTotals.map((row, idx) => {
                    const isSelected = selectedMbu === row.mbu;
                    const share = ((row.liters / (currentPoured || 1)) * 100).toFixed(1);
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
                        <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>{row.mbu}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 800, color: 'var(--accent)' }}>{row.liters.toLocaleString()} L</td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{share}%</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>{Math.round(row.liters / Math.max(1, filteredSummaries.length)).toLocaleString()} L/day</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Timeline */}
          <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px' }}>
              📅 Daily Scratching vs Pouring Timeline ({filteredSummaries.length} Days)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredSummaries.map(day => (
                <div key={day.date} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ width: '80px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{day.date.slice(5)}</span>
                  
                  {/* Scratch & Pour bars */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#3b82f6', width: '60px' }}>Scratch</span>
                      <div style={{ flex: 1, background: 'rgba(59,130,246,0.1)', height: '6px', borderRadius: '3px' }}>
                        <div style={{ width: `${Math.min(100, (day.scratching / 15000) * 100)}%`, height: '100%', background: '#3b82f6', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#3b82f6', width: '55px', textAlign: 'right' }}>{day.scratching} L</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent)', width: '60px' }}>Pour</span>
                      <div style={{ flex: 1, background: 'var(--accent-bg)', height: '6px', borderRadius: '3px' }}>
                        <div style={{ width: `${Math.min(100, (day.pouring / 15000) * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent)', width: '55px', textAlign: 'right' }}>{day.pouring} L</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── SUB-TAB 2: MBU DAILY POURING MATRIX ── */}
      {activeSubTab === 'mbu' && (
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px' }}>
            📊 MBU Day-Wise Pouring Breakdown
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px' }}>Date</th>
                  {mbuList.map(m => (
                    <th key={m} style={{ padding: '8px', textAlign: 'right' }}>{m.slice(3)}</th>
                  ))}
                  <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {fuelData.mbuDaily.map((row: any) => (
                  <tr key={row.date} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: 'var(--text-muted)' }}>{row.date.slice(5)}</td>
                    {mbuList.map(m => (
                      <td key={m} style={{ padding: '8px', textAlign: 'right', color: row[m] ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {row[m] ? row[m].toLocaleString() : '-'}
                      </td>
                    ))}
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: 'var(--accent)' }}>
                      {row.total ? row.total.toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 3: VEHICLES ── */}
      {activeSubTab === 'vehicles' && (
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              🚚 Vehicle & Field Support Officer Fueling ({filteredVehicles.length})
            </h3>
            
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search Vehicle / FSO..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 12px 8px 30px',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {filteredVehicles.map(v => (
              <div key={v.vehicleNo} style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent)' }}>{v.vehicleNo}</span>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 600 }}>
                      FSO: {v.fsoName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {v.area} • {v.mbu}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#3b82f6' }}>
                      {v.totalFuel.toLocaleString()} <span style={{ fontSize: '0.75rem' }}>L</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Month Fuel Drawn</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 4: POURING LOGS ── */}
      {activeSubTab === 'pouring' && (
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              ⛽ Detailed Site Pouring Activities ({filteredPouringLogs.length})
            </h3>
            
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search Site / Vehicle..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 12px 8px 30px',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
            {filteredPouringLogs.slice(0, 100).map((log, idx) => (
              <div key={idx} style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent)' }}>{log.siteCode}</span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: log.visitNature === 'Emergency' ? 'rgba(239,68,68,0.15)' : 'rgba(0,168,107,0.15)', color: log.visitNature === 'Emergency' ? '#f87171' : '#10b981', borderRadius: '4px', fontWeight: 700 }}>
                      {log.visitNature || 'Routine'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{log.mbu}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {log.siteName} • Veh: {log.vehicleNo || 'N/A'} • {log.date}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--accent)' }}>
                    +{log.fuelPoured} L
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Bal: {log.fuelBal} L
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 5: CARDS ── */}
      {activeSubTab === 'cards' && (
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              💳 Card Scratching Logs ({filteredScratching.length})
            </h3>
            
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search Card / Station..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 12px 8px 30px',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
            {filteredScratching.slice(0, 100).map((card, idx) => (
              <div key={idx} style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#3b82f6' }}>Card #{card.cardCode}</span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', borderRadius: '4px', fontWeight: 700 }}>
                      {card.fuelCompany}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{card.mbu}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {card.station || 'Fuel Station'} • {card.date}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#3b82f6' }}>
                    {card.quantity.toLocaleString()} L
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Limit: {card.cardLimit.toLocaleString()} L
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 6: DG SPECS ── */}
      {activeSubTab === 'dgProfiles' && (
        <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              ⚡ Site DG & Genset Specifications ({filteredDgProfiles.length})
            </h3>
            
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search DG / Engine..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 12px 8px 30px',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
            {filteredDgProfiles.slice(0, 100).map((dg, idx) => (
              <div key={idx} style={{ padding: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent)' }}>{dg.siteCode}</span>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{dg.siteName}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', color: 'var(--text-primary)' }}>
                    {dg.dgKva ? `${dg.dgKva} KVA` : 'Standard'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px', fontSize: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Engine: </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{dg.engineBrand || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>DG Brand: </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{dg.dgBrand || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>FLM: </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{dg.flmVendor || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Rate: </span>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{dg.consumptionFactor ? `${dg.consumptionFactor} L/hr` : 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

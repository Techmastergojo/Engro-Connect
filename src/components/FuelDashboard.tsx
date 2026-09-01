import React, { useState, useMemo } from 'react';
import { Fuel, Layers, Search, Filter, Droplet, CreditCard } from 'lucide-react';
import { analyticsData } from '../analyticsData';
import type { PouringLog, ScratchingLog, VehicleFuel, SiteDgProfile } from '../types';

export const FuelDashboard: React.FC = () => {
  const [selectedMbu, setSelectedMbu] = useState<string>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'mbu' | 'vehicles' | 'pouring' | 'cards' | 'dgProfiles'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const fuelData = analyticsData.fuel;
  const mbuList = analyticsData.mbuList;

  // Calculate MBU Pouring Totals
  const mbuPouringTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    mbuList.forEach(m => totals[m] = 0);

    fuelData.mbuDaily.forEach(row => {
      const rowMap = row as Record<string, any>;
      mbuList.forEach(m => {
        if (rowMap[m]) totals[m] += rowMap[m];
      });
    });

    return Object.entries(totals).map(([mbu, liters]) => ({
      mbu,
      liters: Math.round(liters),
    })).sort((a, b) => b.liters - a.liters);
  }, [fuelData.mbuDaily, mbuList]);

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

  // Filtered Site DG Profiles
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

  const totalPoured = selectedMbu === 'ALL' 
    ? fuelData.totalPoured 
    : (mbuPouringTotals.find(x => x.mbu === selectedMbu)?.liters || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* Top Header & MBU Filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge" style={{ margin: 0, padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
              ⛽ Deodar Fuel Activity
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>August 2026</span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0 0', color: 'var(--text-primary)' }}>
            Fuel Consumption & Logistics
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
          { id: 'mbu', label: '📍 MBU Pouring Matrix' },
          { id: 'vehicles', label: '🚚 Vehicle & FSO Fuel (' + filteredVehicles.length + ')' },
          { id: 'pouring', label: '⛽ Site Pouring Logs (' + filteredPouringLogs.length + ')' },
          { id: 'cards', label: '💳 Scratching Cards (' + filteredScratching.length + ')' },
          { id: 'dgProfiles', label: '⚡ DG Profiles (' + filteredDgProfiles.length + ')' },
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
            {fuelData.totalScratched.toLocaleString()} <span style={{ fontSize: '0.85rem' }}>L</span>
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
            {totalPoured.toLocaleString()} <span style={{ fontSize: '0.85rem' }}>L</span>
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
              {(fuelData.totalScratched - fuelData.totalPoured).toLocaleString()} <span style={{ fontSize: '0.85rem' }}>L</span>
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
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Site Visits Logged</span>
        </div>
      </div>

      {/* ── SUB-TAB 1: OVERVIEW & MBU RANKING ── */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* MBU Pouring Ranking Table */}
          <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                📍 MBU Fuel Pouring Distribution
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sorted by Liters Poured</span>
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
                    const share = ((row.liters / (fuelData.totalPoured || 1)) * 100).toFixed(1);
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
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>{Math.round(row.liters / 31).toLocaleString()} L/day</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Scratching vs Pouring Timeline */}
          <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px' }}>
              📅 Daily Scratching vs Pouring Trend
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fuelData.summaryDaily.slice(0, 15).map(day => (
                <div key={day.date} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ width: '80px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{day.date.slice(5)}</span>
                  
                  {/* Scratch Bar */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#3b82f6', width: '60px' }}>Scratch</span>
                      <div style={{ flex: 1, background: 'rgba(59,130,246,0.1)', height: '6px', borderRadius: '3px' }}>
                        <div style={{ width: `${Math.min(100, (day.scratching / 15000) * 100)}%`, height: '100%', background: '#3b82f6', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#3b82f6', width: '55px', textAlign: 'right' }}>{day.scratching} L</span>
                    </div>

                    {/* Pour Bar */}
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

      {/* ── SUB-TAB 3: VEHICLE & FSO ── */}
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

      {/* ── SUB-TAB 4: SITE POURING LOGS ── */}
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
            {filteredPouringLogs.length > 100 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>
                Showing first 100 entries of {filteredPouringLogs.length}. Use search to filter specific records.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 5: SCRATCHING CARDS ── */}
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

      {/* ── SUB-TAB 6: DG PROFILES ── */}
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

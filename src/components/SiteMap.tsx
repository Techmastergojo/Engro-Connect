import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Layers, Navigation, ZoomIn, ZoomOut, X, MapPin, Sun, MessageSquare, ExternalLink } from 'lucide-react';
import type { Site } from '../types';
import { Geolocation } from '@capacitor/geolocation';

interface Props {
  sites: Site[];
  initialFocusSite?: Site | null;
  onClearFocusSite?: () => void;
}

// Tile layers definitions
const TILE_LAYERS = {
  dark: {
    name: '🌙 Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB &copy; OpenStreetMap'
  },
  satellite: {
    name: '🛰️ Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &copy; DigitalGlobe'
  },
  street: {
    name: '🗺️ Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  }
};

// Deterministic color palette for MBUs
const MBU_PALETTE = [
  '#00a86b', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#10b981', '#f97316', '#6366f1', '#14b8a6',
  '#e11d48', '#84cc16', '#0ea5e9', '#a855f7', '#eab308'
];

function getMbuColor(mbu: string): string {
  let hash = 0;
  for (let i = 0; i < mbu.length; i++) {
    hash = mbu.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MBU_PALETTE[Math.abs(hash) % MBU_PALETTE.length];
}

// 2D Convex Hull (Monotone Chain) with buffer padding for regional boundaries
function computeConvexHull(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points;
  const sorted = points.slice().sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: [number, number][] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: [number, number][] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  const hull = lower.concat(upper);

  // Expand polygon slightly by ~0.012 deg (~1.3 km) so boundary pads outer sites nicely
  if (hull.length >= 3) {
    const centerLat = hull.reduce((sum, p) => sum + p[0], 0) / hull.length;
    const centerLng = hull.reduce((sum, p) => sum + p[1], 0) / hull.length;
    return hull.map(([lat, lng]) => {
      const dLat = lat - centerLat;
      const dLng = lng - centerLng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng) || 1;
      return [lat + (dLat / dist) * 0.012, lng + (dLng / dist) * 0.012];
    });
  }

  return hull;
}

export const SiteMap: React.FC<Props> = ({ sites, initialFocusSite, onClearFocusSite }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const boundariesLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  const [activeTileType, setActiveTileType] = useState<'dark' | 'satellite' | 'street'>('dark');
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedMbu, setSelectedMbu] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Site[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedSitePopup, setSelectedSitePopup] = useState<Site | null>(null);

  // Extract unique MBUs sorted alphabetically
  const mbuList = useMemo(() => {
    const set = new Set<string>();
    sites.forEach(s => {
      const mbu = s.mbuNumber || s.mbuName;
      if (mbu && mbu.trim() !== '') set.add(mbu.trim());
    });
    return Array.from(set).sort();
  }, [sites]);

  // Group sites by MBU for boundary calculations
  const sitesByMbu = useMemo(() => {
    const map = new Map<string, Site[]>();
    sites.forEach(site => {
      if (typeof site.lat !== 'number' || typeof site.lng !== 'number' || isNaN(site.lat) || isNaN(site.lng)) return;
      const mbu = site.mbuNumber || site.mbuName || 'Unassigned';
      if (!map.has(mbu)) map.set(mbu, []);
      map.get(mbu)!.push(site);
    });
    return map;
  }, [sites]);

  // Filtered sites based on MBU and Search
  const filteredSites = useMemo(() => {
    return sites.filter(s => {
      if (typeof s.lat !== 'number' || typeof s.lng !== 'number' || isNaN(s.lat) || isNaN(s.lng)) return false;
      if (selectedMbu !== 'ALL') {
        const mbu = s.mbuNumber || s.mbuName || '';
        if (mbu !== selectedMbu) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesMbu = (s.mbuNumber && s.mbuNumber.toLowerCase().includes(q)) || (s.mbuName && s.mbuName.toLowerCase().includes(q));
        const matchesOp = (s.jazzId && s.jazzId.toLowerCase().includes(q)) ||
                          (s.telenorId && s.telenorId.toLowerCase().includes(q)) ||
                          (s.zongId && s.zongId.toLowerCase().includes(q)) ||
                          (s.ufoneId && s.ufoneId.toLowerCase().includes(q));
        if (!matchesName && !matchesMbu && !matchesOp) return false;
      }
      return true;
    });
  }, [sites, selectedMbu, searchQuery]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center in Pakistan (near Punjab / central Pakistan)
    const map = L.map(mapContainerRef.current, {
      center: [31.5204, 74.3587],
      zoom: 8,
      zoomControl: false,
      attributionControl: false
    });

    const initialTile = L.tileLayer(TILE_LAYERS[activeTileType].url, {
      maxZoom: 19,
      attribution: TILE_LAYERS[activeTileType].attribution
    }).addTo(map);

    tileLayerRef.current = initialTile;
    markersLayerRef.current = L.layerGroup().addTo(map);
    boundariesLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Invalidate size after mount in case layout shifted
    setTimeout(() => map.invalidateSize(), 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Change Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const newTile = L.tileLayer(TILE_LAYERS[activeTileType].url, {
      maxZoom: 19,
      attribution: TILE_LAYERS[activeTileType].attribution
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTile;
  }, [activeTileType]);

  // 3. Render MBU Boundaries
  useEffect(() => {
    const map = mapInstanceRef.current;
    const boundaryLayer = boundariesLayerRef.current;
    if (!map || !boundaryLayer) return;

    boundaryLayer.clearLayers();

    if (!showBoundaries) return;

    sitesByMbu.forEach((mbuSites, mbuName) => {
      // If a single MBU is selected, only show that MBU
      if (selectedMbu !== 'ALL' && mbuName !== selectedMbu) return;

      const points: [number, number][] = mbuSites.map(s => [s.lat, s.lng]);
      const color = getMbuColor(mbuName);

      if (points.length >= 3) {
        const hull = computeConvexHull(points);
        if (hull.length >= 3) {
          const polygon = L.polygon(hull, {
            color: color,
            fillColor: color,
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '5, 5',
          });

          // Centroid calculation for label placement
          const centerLat = hull.reduce((sum, p) => sum + p[0], 0) / hull.length;
          const centerLng = hull.reduce((sum, p) => sum + p[1], 0) / hull.length;

          // Tooltip for MBU boundary
          polygon.bindTooltip(`
            <div style="font-weight:700; color:${color}; font-size:0.85rem;">${mbuName}</div>
            <div style="font-size:0.75rem; color:#fff;">${mbuSites.length} Tower Sites</div>
          `, { sticky: true, opacity: 0.95 });

          // Centroid text label
          const centroidIcon = L.divIcon({
            className: 'mbu-centroid-label',
            html: `
              <div style="
                background: rgba(0,0,0,0.7);
                border: 1px solid ${color};
                color: ${color};
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.72rem;
                font-weight: 800;
                white-space: nowrap;
                transform: translate(-50%, -50%);
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                backdrop-filter: blur(4px);
              ">
                ${mbuName} (${mbuSites.length})
              </div>
            `,
            iconSize: [0, 0]
          });

          const centroidMarker = L.marker([centerLat, centerLng], { icon: centroidIcon, interactive: false });

          boundaryLayer.addLayer(polygon);
          boundaryLayer.addLayer(centroidMarker);
        }
      } else if (points.length === 2) {
        // Draw a bounding line for 2 sites
        const line = L.polyline(points, { color, weight: 3, dashArray: '4, 4' });
        line.bindTooltip(`MBU: ${mbuName} (2 Sites)`, { sticky: true });
        boundaryLayer.addLayer(line);
      } else if (points.length === 1) {
        // Draw a circle buffer for single isolated site
        const circle = L.circle(points[0], {
          radius: 1500,
          color,
          fillColor: color,
          fillOpacity: 0.12,
          weight: 1.5,
          dashArray: '4, 4'
        });
        circle.bindTooltip(`MBU: ${mbuName} (1 Site)`, { sticky: true });
        boundaryLayer.addLayer(circle);
      }
    });
  }, [sitesByMbu, showBoundaries, selectedMbu]);

  // 4. Render Site Pins & Labels
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // Use Canvas renderer for maximum 60FPS fluid pan/zoom
    const canvasRenderer = L.canvas({ padding: 0.5 });

    filteredSites.forEach(site => {
      const isSolar = site.solar && site.solar.toLowerCase() === 'yes';
      const isHub = site.category && (site.category.toLowerCase() === 'hub' || site.category.toLowerCase() === 'ne hub');
      const pinColor = isHub ? '#c084fc' : isSolar ? '#f59e0b' : '#00a86b';

      // Pin marker
      const marker = L.circleMarker([site.lat, site.lng], {
        renderer: canvasRenderer,
        radius: isHub ? 7 : isSolar ? 6 : 5.5,
        fillColor: pinColor,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.88,
      });

      // Tooltip on hover
      marker.bindTooltip(`
        <div style="font-weight: 800; font-size: 0.85rem; color: #fff;">${site.name}</div>
        <div style="font-size: 0.72rem; color: #94a3b8;">${site.mbuNumber || site.mbuName || 'No MBU'}</div>
        ${isHub ? '<span style="color:#c084fc; font-weight:700; font-size:0.68rem;">★ NE HUB</span>' : ''}
        ${isSolar ? '<span style="color:#f59e0b; font-weight:700; font-size:0.68rem;">⚡ SOLAR</span>' : ''}
      `, { opacity: 0.95 });

      marker.on('click', () => {
        setSelectedSitePopup(site);
        map.flyTo([site.lat, site.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
      });

      markersLayer.addLayer(marker);

      // If showLabels is enabled and user is zoomed in enough (zoom >= 11) or specific MBU selected:
      if (showLabels && (selectedMbu !== 'ALL' || filteredSites.length <= 150)) {
        const textIcon = L.divIcon({
          className: 'site-pin-label',
          html: `
            <div style="
              font-size: 0.65rem;
              font-weight: 700;
              color: #ffffff;
              background: rgba(15, 23, 42, 0.85);
              border: 1px solid ${pinColor};
              border-radius: 4px;
              padding: 1px 4px;
              white-space: nowrap;
              transform: translate(-50%, 8px);
              pointer-events: none;
              box-shadow: 0 2px 4px rgba(0,0,0,0.5);
            ">
              ${site.name}
            </div>
          `,
          iconSize: [0, 0]
        });
        const labelMarker = L.marker([site.lat, site.lng], { icon: textIcon, interactive: false });
        markersLayer.addLayer(labelMarker);
      }
    });
  }, [filteredSites, showLabels, selectedMbu]);

  // 5. Handle Initial Site Focus (e.g., clicked "Locate on Map" from SiteCard)
  useEffect(() => {
    if (!initialFocusSite || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    setSelectedSitePopup(initialFocusSite);
    map.flyTo([initialFocusSite.lat, initialFocusSite.lng], 15, { duration: 0.8 });
    if (onClearFocusSite) onClearFocusSite();
  }, [initialFocusSite]);

  // 6. Auto-zoom when search narrows results
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    // Build a quick name-match list for the dropdown (top 8 by name)
    const q = searchQuery.trim().toLowerCase();
    const nameMatches = sites.filter(s => {
      if (typeof s.lat !== 'number' || typeof s.lng !== 'number' || isNaN(s.lat) || isNaN(s.lng)) return false;
      return s.name.toLowerCase().includes(q) ||
             (s.jazzId && s.jazzId.toLowerCase().includes(q)) ||
             (s.telenorId && s.telenorId.toLowerCase().includes(q)) ||
             (s.zongId && s.zongId.toLowerCase().includes(q)) ||
             (s.ufoneId && s.ufoneId.toLowerCase().includes(q)) ||
             (s.mbuNumber && s.mbuNumber.toLowerCase().includes(q)) ||
             (s.mbuName && s.mbuName.toLowerCase().includes(q));
    });

    setSearchResults(nameMatches.slice(0, 8));
    setShowSearchDropdown(nameMatches.length > 0 && nameMatches.length <= 20);

    // Auto-zoom logic
    if (nameMatches.length === 1) {
      // Single match: fly directly to site and open popup
      const site = nameMatches[0];
      setSelectedSitePopup(site);
      map.flyTo([site.lat, site.lng], 15, { duration: 0.7, easeLinearity: 0.5 });
    } else if (nameMatches.length >= 2 && nameMatches.length <= 5) {
      // Few matches: fit bounds with generous padding so surrounding context is visible
      const bounds = L.latLngBounds(nameMatches.map(s => [s.lat, s.lng]));
      map.flyToBounds(bounds, {
        paddingTopLeft: [80, 120],
        paddingBottomRight: [80, 60],
        maxZoom: 14,
        duration: 0.7,
      });
    }
  }, [searchQuery, sites]);

  // Fit bounds when MBU filter changes
  const handleMbuChange = (mbu: string) => {
    setSelectedMbu(mbu);
    if (!mapInstanceRef.current) return;

    if (mbu === 'ALL') {
      const validSites = sites.filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');
      if (validSites.length > 0) {
        const bounds = L.latLngBounds(validSites.map(s => [s.lat, s.lng]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      }
    } else {
      const mbuSites = sitesByMbu.get(mbu) || [];
      if (mbuSites.length > 0) {
        const bounds = L.latLngBounds(mbuSites.map(s => [s.lat, s.lng]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      }
    }
  };

  // Get User's GPS Location
  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 0.8 });

        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.setLatLng([lat, lng]);
        } else {
          const userIcon = L.divIcon({
            className: 'user-location-pulse',
            html: `
              <div style="
                width: 18px;
                height: 18px;
                background: #3b82f6;
                border: 2px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 0 12px #3b82f6;
                animation: pulse 1.8s infinite;
              "></div>
            `,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });
          userLocationMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(mapInstanceRef.current);
          userLocationMarkerRef.current.bindTooltip('Your Location', { permanent: true, direction: 'top' });
        }
      }
    } catch (e) {
      alert('Could not determine your GPS location. Please ensure location services are enabled.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 180px)', minHeight: '520px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      {/* ── TOP MAP FLOATING CONTROLS ── */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        right: '12px',
        zIndex: 1000,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
        background: 'rgba(10, 15, 12, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '10px 14px',
        borderRadius: '12px',
        border: '1px solid var(--border)'
      }}>
        {/* Search Input + Autocomplete Dropdown */}
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 2 }} />
          <input
            className="input"
            style={{ padding: '8px 36px 8px 36px', fontSize: '0.85rem', width: '100%', background: 'rgba(0,0,0,0.4)', borderRadius: '8px' }}
            placeholder="Search site, MBU, or operator ID..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
            onFocus={() => searchQuery && setShowSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); setSelectedSitePopup(null); }}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 2 }}
            >
              <X size={14} />
            </button>
          )}
          {/* Autocomplete Results Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: 'rgba(10, 15, 12, 0.97)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--accent)',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
              zIndex: 2000,
              maxHeight: '280px',
              overflowY: 'auto',
            }}>
              {searchResults.map((site, idx) => {
                const isSolar = site.solar?.toLowerCase() === 'yes';
                const isHub = site.category?.toLowerCase().includes('hub');
                const pinColor = isHub ? '#c084fc' : isSolar ? '#f59e0b' : '#00a86b';
                return (
                  <button
                    key={site.id}
                    onMouseDown={() => {
                      setSelectedSitePopup(site);
                      setShowSearchDropdown(false);
                      mapInstanceRef.current?.flyTo([site.lat, site.lng], 15, { duration: 0.7 });
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 14px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: idx < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,168,107,0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: pinColor, flexShrink: 0, border: '1.5px solid #fff' }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{site.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{site.mbuNumber || site.mbuName || 'No MBU'}{isHub ? ' · HUB' : ''}{isSolar ? ' · ⚡Solar' : ''}</div>
                    </div>
                    <MapPin size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </button>
                );
              })}
              {searchResults.length >= 8 && (
                <div style={{ padding: '6px 14px', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  Type more to narrow results…
                </div>
              )}
            </div>
          )}
        </div>

        {/* MBU Dropdown Filter */}
        <select
          value={selectedMbu}
          onChange={e => handleMbuChange(e.target.value)}
          style={{
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
            flex: '1 1 140px'
          }}
        >
          <option value="ALL">All MBUs ({sites.length} sites)</option>
          {mbuList.map(mbu => {
            const count = sitesByMbu.get(mbu)?.length || 0;
            return <option key={mbu} value={mbu}>{mbu} ({count})</option>;
          })}
        </select>

        {/* Toggle Boundaries */}
        <button
          onClick={() => setShowBoundaries(!showBoundaries)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: showBoundaries ? 'var(--accent)' : 'var(--surface)',
            color: showBoundaries ? '#fff' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
            cursor: 'pointer'
          }}
          title="Toggle MBU Region Boundaries"
        >
          <Layers size={14} /> {showBoundaries ? 'Boundaries ON' : 'Boundaries OFF'}
        </button>

        {/* Toggle Site Labels */}
        <button
          onClick={() => setShowLabels(!showLabels)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: showLabels ? 'var(--accent)' : 'var(--surface)',
            color: showLabels ? '#fff' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
            cursor: 'pointer'
          }}
          title="Toggle Site Name Labels"
        >
          <MapPin size={14} /> {showLabels ? 'Labels ON' : 'Labels OFF'}
        </button>

        {/* Tile Basemap Switcher */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          {(['dark', 'satellite', 'street'] as const).map(type => (
            <button
              key={type}
              onClick={() => setActiveTileType(type)}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: activeTileType === type ? 'var(--accent)' : 'transparent',
                color: activeTileType === type ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              {type === 'dark' ? 'Dark' : type === 'satellite' ? 'Sat' : 'OSM'}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAP CANVAS CONTAINER ── */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* ── RIGHT BOTTOM UTILITY BUTTONS (Zoom + GPS) ── */}
      <div style={{ position: 'absolute', bottom: '24px', right: '16px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className="glass"
          style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: 'var(--accent)', cursor: 'pointer' }}
          title="Zoom to My Location"
        >
          <Navigation size={18} style={{ transform: isLocating ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} />
        </button>

        <button
          onClick={handleZoomIn}
          className="glass"
          style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: 'var(--text-primary)', cursor: 'pointer' }}
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>

        <button
          onClick={handleZoomOut}
          className="glass"
          style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: 'var(--text-primary)', cursor: 'pointer' }}
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
      </div>

      {/* ── BOTTOM LEFT STATUS INDICATOR ── */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        zIndex: 1000,
        background: 'rgba(10, 15, 12, 0.8)',
        backdropFilter: 'blur(8px)',
        padding: '6px 12px',
        borderRadius: '20px',
        border: '1px solid var(--border)',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
        <span>Displaying {filteredSites.length} of {sites.length} sites</span>
        {selectedMbu !== 'ALL' && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>• {selectedMbu}</span>}
      </div>

      {/* ── SELECTED SITE MODAL POPUP CARD ── */}
      {selectedSitePopup && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1100,
          width: '92%',
          maxWidth: '440px',
          animation: 'slideUp 0.25s ease'
        }}>
          <div className="glass" style={{
            padding: '16px 18px',
            border: '1px solid var(--accent)',
            boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedSitePopup(null)}
              style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--text-muted)', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span className="badge" style={{ background: 'var(--accent)', color: '#fff' }}>{selectedSitePopup.mbuNumber || 'NO MBU'}</span>
              {selectedSitePopup.siteStatus && (
                <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>{selectedSitePopup.siteStatus}</span>
              )}
              {selectedSitePopup.solar?.toLowerCase() === 'yes' && (
                <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Sun size={11} /> Solar
                </span>
              )}
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 2px', color: 'var(--text-primary)' }}>
              {selectedSitePopup.name}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 10px' }}>
              📍 {selectedSitePopup.lat.toFixed(6)}, {selectedSitePopup.lng.toFixed(6)} • {selectedSitePopup.mbuName || 'Unassigned'}
            </p>

            {/* Operator IDs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px', fontSize: '0.78rem' }}>
              <div style={{ background: 'var(--accent-bg)', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'block' }}>Jazz</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedSitePopup.jazzId || '-'}</strong>
              </div>
              <div style={{ background: 'var(--accent-bg)', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'block' }}>Telenor</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedSitePopup.telenorId || '-'}</strong>
              </div>
              <div style={{ background: 'var(--accent-bg)', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'block' }}>Zong</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedSitePopup.zongId || '-'}</strong>
              </div>
              <div style={{ background: 'var(--accent-bg)', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'block' }}>Ufone</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedSitePopup.ufoneId || '-'}</strong>
              </div>
            </div>

            {/* Action CTAs */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-accent"
                onClick={() => window.open(`https://maps.google.com/?q=${selectedSitePopup.lat},${selectedSitePopup.lng}`, '_blank')}
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <ExternalLink size={14} /> Open Navigation
              </button>
              {selectedSitePopup.cellNumber && (
                <button
                  className="btn-whatsapp"
                  onClick={() => {
                    let phone = selectedSitePopup.cellNumber.replace(/\D/g, '');
                    if (phone.length === 10 && phone.startsWith('3')) phone = '92' + phone;
                    else if (phone.startsWith('0') && phone.length === 11) phone = '92' + phone.substring(1);
                    else if (!phone.startsWith('92')) phone = '92' + phone;
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${selectedSitePopup.mbuName}, regarding Site ${selectedSitePopup.name}`)}`, '_blank');
                  }}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <MessageSquare size={14} /> WhatsApp MBU
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

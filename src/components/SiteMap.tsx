import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Feature, FeatureCollection } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Search, Layers, Navigation, ZoomIn, ZoomOut, X, MapPin, Sun, MessageSquare, ExternalLink, Key, Zap } from 'lucide-react';
import type { Site } from '../types';
import { Geolocation } from '@capacitor/geolocation';

interface Props {
  sites: Site[];
  initialFocusSite?: Site | null;
  onClearFocusSite?: () => void;
}

// Map styles for Mapbox
const STYLES = {
  satellite: { label: '🛰️ Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  dark:      { label: '🌙 Dark',      url: 'mapbox://styles/mapbox/dark-v11' },
  street:    { label: '🗺️ Street',    url: 'mapbox://styles/mapbox/streets-v12' },
} as const;
type StyleKey = keyof typeof STYLES;

// Free OpenStreetMap Raster Style (Works without any Mapbox token)
const OSM_RASTER_STYLE: any = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

// Deterministic MBU color palette
const MBU_PALETTE = [
  '#00a86b','#3b82f6','#f59e0b','#8b5cf6','#ec4899',
  '#06b6d4','#10b981','#f97316','#6366f1','#14b8a6',
  '#e11d48','#84cc16','#0ea5e9','#a855f7','#eab308',
];
function getMbuColor(mbu: string): string {
  let h = 0;
  for (let i = 0; i < mbu.length; i++) h = mbu.charCodeAt(i) + ((h << 5) - h);
  return MBU_PALETTE[Math.abs(h) % MBU_PALETTE.length];
}

// Convex hull (Monotone chain) for MBU boundary polygons
function convexHull(pts: [number, number][]): [number, number][] {
  if (pts.length < 3) return pts;
  const s = pts.slice().sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);
  const cross = (o: [number,number], a: [number,number], b: [number,number]) =>
    (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const lo: [number,number][] = [];
  for (const p of s) { while (lo.length >= 2 && cross(lo[lo.length-2], lo[lo.length-1], p) <= 0) lo.pop(); lo.push(p); }
  const hi: [number,number][] = [];
  for (let i = s.length-1; i >= 0; i--) { const p = s[i]; while (hi.length >= 2 && cross(hi[hi.length-2], hi[hi.length-1], p) <= 0) hi.pop(); hi.push(p); }
  lo.pop(); hi.pop();
  const hull = lo.concat(hi);
  if (hull.length >= 3) {
    const cLat = hull.reduce((sum, p) => sum + p[0], 0) / hull.length;
    const cLng = hull.reduce((sum, p) => sum + p[1], 0) / hull.length;
    return hull.map(([lat, lng]) => {
      const dLat = lat - cLat, dLng = lng - cLng;
      const d = Math.sqrt(dLat*dLat + dLng*dLng) || 1;
      return [lat + (dLat/d)*0.012, lng + (dLng/d)*0.012];
    });
  }
  return hull;
}

// Build GeoJSON FeatureCollection of MBU boundary polygons
function buildBoundaryGeoJSON(sitesByMbu: Map<string, Site[]>): FeatureCollection {
  const features: Feature[] = [];
  sitesByMbu.forEach((mbsSites, mbuName) => {
    const color = getMbuColor(mbuName);
    const pts: [number, number][] = mbsSites.map(s => [s.lat, s.lng]);
    if (pts.length >= 3) {
      const hull = convexHull(pts);
      if (hull.length >= 3) {
        const coords = hull.map(([lat, lng]) => [lng, lat]);
        coords.push(coords[0]);
        features.push({
          type: 'Feature',
          properties: { mbuName, color, count: mbsSites.length },
          geometry: { type: 'Polygon', coordinates: [coords] },
        });
      }
    } else if (pts.length >= 1) {
      features.push({
        type: 'Feature',
        properties: { mbuName, color, count: mbsSites.length, isPoint: true },
        geometry: { type: 'Point', coordinates: [pts[0][1], pts[0][0]] },
      });
    }
  });
  return { type: 'FeatureCollection', features };
}

// Build GeoJSON FeatureCollection of site pins
function buildSitesGeoJSON(sites: Site[]): FeatureCollection {
  const features: Feature[] = sites
    .filter(s => typeof s.lat === 'number' && typeof s.lng === 'number' && !isNaN(s.lat) && !isNaN(s.lng))
    .map(s => ({
      type: 'Feature' as const,
      properties: {
        id: s.id,
        name: s.name,
        mbuNumber: s.mbuNumber || '',
        mbuName: s.mbuName || '',
        lat: s.lat,
        lng: s.lng,
        solar: s.solar || '',
        category: s.category || '',
        siteStatus: s.siteStatus || '',
        jazzId: s.jazzId || '',
        telenorId: s.telenorId || '',
        zongId: s.zongId || '',
        ufoneId: s.ufoneId || '',
        cellNumber: s.cellNumber || '',
        dgStatus: s.dgStatus || '',
        dgShared: s.dgShared || '',
        powerStatus: s.powerStatus || '',
        securityVendor: s.securityVendor || '',
        guestOmo: s.guestOmo || '',
        networkPortfolio: s.networkPortfolio || '',
        zonalManager: s.zonalManager || '',
        neLocation: s.neLocation || '',
        tpId: s.tpId || '',
        color: (s.category?.toLowerCase().includes('hub')) ? '#c084fc'
             : (s.solar?.toLowerCase() === 'yes') ? '#f59e0b'
             : '#00a86b',
      },
      geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
    }));
  return { type: 'FeatureCollection', features };
}

export const SiteMap: React.FC<Props> = ({ sites, initialFocusSite, onClearFocusSite }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Token resolution: localStorage -> env
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem('mapbox_token') || import.meta.env.VITE_MAPBOX_TOKEN || '';
  });
  const [tokenInput, setTokenInput] = useState('');
  const [useFreeOsm, setUseFreeOsm] = useState<boolean>(() => {
    return localStorage.getItem('map_use_free_osm') === 'true' && !localStorage.getItem('mapbox_token') && !import.meta.env.VITE_MAPBOX_TOKEN;
  });
  const [showTokenModal, setShowTokenModal] = useState(false);

  const [activeStyle, setActiveStyle] = useState<StyleKey>('satellite');
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [selectedMbu, setSelectedMbu] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Site[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Unique sorted MBU list
  const mbuList = useMemo(() => {
    const s = new Set<string>();
    sites.forEach(site => { const m = site.mbuNumber || site.mbuName; if (m?.trim()) s.add(m.trim()); });
    return Array.from(s).sort();
  }, [sites]);

  // Sites grouped by MBU
  const sitesByMbu = useMemo(() => {
    const m = new Map<string, Site[]>();
    sites.forEach(site => {
      if (typeof site.lat !== 'number' || isNaN(site.lat)) return;
      const mbu = site.mbuNumber || site.mbuName || 'Unassigned';
      if (!m.has(mbu)) m.set(mbu, []);
      m.get(mbu)!.push(site);
    });
    return m;
  }, [sites]);

  // Filtered sites
  const filteredSites = useMemo(() => {
    return sites.filter(s => {
      if (typeof s.lat !== 'number' || isNaN(s.lat)) return false;
      if (selectedMbu !== 'ALL') {
        const mbu = s.mbuNumber || s.mbuName || '';
        if (mbu !== selectedMbu) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return s.name.toLowerCase().includes(q)
          || (s.mbuNumber?.toLowerCase().includes(q))
          || (s.mbuName?.toLowerCase().includes(q))
          || (s.jazzId?.toLowerCase().includes(q))
          || (s.telenorId?.toLowerCase().includes(q))
          || (s.zongId?.toLowerCase().includes(q))
          || (s.ufoneId?.toLowerCase().includes(q));
      }
      return true;
    });
  }, [sites, selectedMbu, searchQuery]);

  // Save manual token
  const handleSaveToken = (newToken: string) => {
    const cleaned = newToken.trim();
    if (cleaned) {
      localStorage.setItem('mapbox_token', cleaned);
      localStorage.removeItem('map_use_free_osm');
      setToken(cleaned);
      setUseFreeOsm(false);
      setShowTokenModal(false);
    }
  };

  const handleUseFreeOsm = () => {
    localStorage.setItem('map_use_free_osm', 'true');
    setUseFreeOsm(true);
    setShowTokenModal(false);
  };

  // ── 1. Init map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    if (!token && !useFreeOsm) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      setMapReady(false);
    }

    if (token) {
      mapboxgl.accessToken = token;
    }

    const styleToUse = (!token || useFreeOsm) ? OSM_RASTER_STYLE : STYLES[activeStyle].url;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleToUse,
      center: [74.3587, 31.5204],
      zoom: 6,
      attributionControl: false,
    });

    map.on('load', () => {
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [token, useFreeOsm]);

  // ── 2. Change style ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !token || useFreeOsm) return;
    map.setStyle(STYLES[activeStyle].url);
    map.once('style.load', () => setMapReady(true));
    setMapReady(false);
  }, [activeStyle, token, useFreeOsm]);

  // ── 3. Update layers when map is ready + data changes ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // ── Boundary polygons ──
    const boundaryData = buildBoundaryGeoJSON(
      selectedMbu === 'ALL' ? sitesByMbu
        : new Map([[selectedMbu, sitesByMbu.get(selectedMbu) || []]])
    );

    if (map.getSource('boundaries')) {
      (map.getSource('boundaries') as mapboxgl.GeoJSONSource).setData(boundaryData);
    } else {
      map.addSource('boundaries', { type: 'geojson', data: boundaryData });
      map.addLayer({
        id: 'boundary-fill',
        type: 'fill',
        source: 'boundaries',
        filter: ['!=', ['get', 'isPoint'], true],
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.13,
        },
      });
      map.addLayer({
        id: 'boundary-line',
        type: 'line',
        source: 'boundaries',
        filter: ['!=', ['get', 'isPoint'], true],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.85,
        },
      });
      map.addLayer({
        id: 'boundary-label',
        type: 'symbol',
        source: 'boundaries',
        filter: ['!=', ['get', 'isPoint'], true],
        layout: {
          'text-field': ['concat', ['get', 'mbuName'], ' (', ['to-string', ['get', 'count']], ')'],
          'text-size': 11,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-anchor': 'center',
          'symbol-placement': 'point',
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': 'rgba(0,0,0,0.85)',
          'text-halo-width': 2,
        },
      });
    }

    // Show/hide boundaries
    ['boundary-fill', 'boundary-line', 'boundary-label'].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showBoundaries ? 'visible' : 'none');
    });

    // ── Site pins ──
    const sitesData = buildSitesGeoJSON(filteredSites);

    if (map.getSource('sites')) {
      (map.getSource('sites') as mapboxgl.GeoJSONSource).setData(sitesData);
    } else {
      map.addSource('sites', { type: 'geojson', data: sitesData, cluster: false });

      // Outer glow circle
      map.addLayer({
        id: 'site-glow',
        type: 'circle',
        source: 'sites',
        paint: {
          'circle-radius': 11,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.18,
          'circle-blur': 1,
        },
      });

      // Main pin circle
      map.addLayer({
        id: 'site-pin',
        type: 'circle',
        source: 'sites',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'category'], 'hub'], 7, ['==', ['get', 'category'], 'NE Hub'], 7, 5.5],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.8,
          'circle-opacity': 0.92,
        },
      });

      // Site name labels (shown when zoomed in)
      map.addLayer({
        id: 'site-label',
        type: 'symbol',
        source: 'sites',
        minzoom: 11,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.9)',
          'text-halo-width': 1.5,
        },
      });

      // Click on a pin
      map.on('click', 'site-pin', (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const props = feat.properties as Record<string, string | null>;
        const site = sites.find(s => s.id === props.id);
        if (site) setSelectedSite(site);
        map.flyTo({ center: [parseFloat(props.lng ?? '0'), parseFloat(props.lat ?? '0')], zoom: Math.max(map.getZoom(), 14), duration: 600 });
      });

      map.on('mouseenter', 'site-pin', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'site-pin', () => { map.getCanvas().style.cursor = ''; });
    }
  }, [mapReady, filteredSites, sitesByMbu, showBoundaries, selectedMbu, sites]);

  // ── 4. Auto-zoom on search ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!searchQuery.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    const q = searchQuery.trim().toLowerCase();
    const matches = sites.filter(s =>
      typeof s.lat === 'number' && !isNaN(s.lat) && (
        s.name.toLowerCase().includes(q) ||
        s.mbuNumber?.toLowerCase().includes(q) ||
        s.mbuName?.toLowerCase().includes(q) ||
        s.jazzId?.toLowerCase().includes(q) ||
        s.telenorId?.toLowerCase().includes(q) ||
        s.zongId?.toLowerCase().includes(q) ||
        s.ufoneId?.toLowerCase().includes(q)
      )
    );
    setSearchResults(matches.slice(0, 8));
    setShowDropdown(matches.length > 0 && matches.length <= 20);
    if (!map) return;
    if (matches.length === 1) {
      setSelectedSite(matches[0]);
      map.flyTo({ center: [matches[0].lng, matches[0].lat], zoom: 15, duration: 700 });
    } else if (matches.length >= 2 && matches.length <= 5) {
      const lngs = matches.map(s => s.lng), lats = matches.map(s => s.lat);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: { top: 120, bottom: 80, left: 80, right: 80 }, maxZoom: 14, duration: 700 }
      );
    }
  }, [searchQuery, sites]);

  // ── 5. Focus site from list ────────────────────────────────────────────────
  useEffect(() => {
    if (!initialFocusSite || !mapRef.current) return;
    setSelectedSite(initialFocusSite);
    mapRef.current.flyTo({ center: [initialFocusSite.lng, initialFocusSite.lat], zoom: 15, duration: 800 });
    if (onClearFocusSite) onClearFocusSite();
  }, [initialFocusSite]);

  // ── MBU filter with fly-to ─────────────────────────────────────────────────
  const handleMbuChange = useCallback((mbu: string) => {
    setSelectedMbu(mbu);
    const map = mapRef.current;
    if (!map) return;
    if (mbu === 'ALL') {
      const valid = sites.filter(s => typeof s.lat === 'number' && !isNaN(s.lat));
      if (valid.length) {
        const lngs = valid.map(s => s.lng), lats = valid.map(s => s.lat);
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 40, maxZoom: 12, duration: 700 });
      }
    } else {
      const mbuSites = sitesByMbu.get(mbu) || [];
      if (mbuSites.length) {
        const lngs = mbuSites.map(s => s.lng), lats = mbuSites.map(s => s.lat);
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, maxZoom: 14, duration: 700 });
      }
    }
  }, [sites, sitesByMbu]);

  // ── GPS locate ────────────────────────────────────────────────────────────
  const handleLocate = useCallback(async () => {
    setIsLocating(true);
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const { latitude: lat, longitude: lng } = pos.coords;
      const map = mapRef.current;
      if (!map) return;
      map.flyTo({ center: [lng, lat], zoom: 14, duration: 800 });
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([lng, lat]);
      } else {
        const el = document.createElement('div');
        el.style.cssText = 'width:18px;height:18px;background:#3b82f6;border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 14px #3b82f6';
        userMarkerRef.current = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map);
      }
    } catch { alert('Could not get GPS location. Enable location services.'); }
    finally { setIsLocating(false); }
  }, []);

  // ── Initial Setup if no token & not freeOsm ────────────────────────────────
  if (!token && !useFreeOsm) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '520px', height: 'calc(100vh - 180px)', gap: '16px', color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>
        <div style={{ fontSize: '3rem' }}>🗺️</div>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Engro Sites Interactive Map</h3>
        <p style={{ fontSize: '0.88rem', maxWidth: '420px', lineHeight: 1.6, margin: 0 }}>
          For high-resolution satellite imagery, enter your free Mapbox Public Token, or start immediately with OpenStreetMap.
        </p>

        <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            className="input"
            style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)' }}
            placeholder="pk.eyJ1..."
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
          />
          <button
            className="btn-accent"
            onClick={() => handleSaveToken(tokenInput)}
            disabled={!tokenInput.trim()}
            style={{ padding: '10px 16px', fontWeight: 700 }}
          >
            Save &amp; Load Mapbox Satellite
          </button>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>— or —</div>
          <button
            className="btn-ghost"
            onClick={handleUseFreeOsm}
            style={{ padding: '10px 16px', fontWeight: 600 }}
          >
            Continue with Free OpenStreetMap (No Key)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 180px)', minHeight: '520px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>

      {/* ── TOP CONTROLS ── */}
      <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', zIndex: 10, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', background: 'rgba(10,15,12,0.88)', backdropFilter: 'blur(16px)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)' }}>

        {/* Search + Autocomplete */}
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 2 }} />
          <input
            className="input"
            style={{ padding: '8px 34px 8px 34px', fontSize: '0.85rem', width: '100%', background: 'rgba(0,0,0,0.4)', borderRadius: '8px' }}
            placeholder="Search site, MBU, or operator ID…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => searchQuery && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setShowDropdown(false); setSelectedSite(null); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 2 }}>
              <X size={14} />
            </button>
          )}
          {showDropdown && searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'rgba(10,15,12,0.97)', backdropFilter: 'blur(20px)', border: '1px solid var(--accent)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.7)', zIndex: 2000, maxHeight: '260px', overflowY: 'auto' }}>
              {searchResults.map((s, idx) => {
                const isHub = s.category?.toLowerCase().includes('hub');
                const isSolar = s.solar?.toLowerCase() === 'yes';
                const pinColor = isHub ? '#c084fc' : isSolar ? '#f59e0b' : '#00a86b';
                return (
                  <button key={s.id} onMouseDown={() => { setSelectedSite(s); setShowDropdown(false); mapRef.current?.flyTo({ center: [s.lng, s.lat], zoom: 15, duration: 700 }); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: 'transparent', border: 'none', borderBottom: idx < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,168,107,0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pinColor, flexShrink: 0, border: '1.5px solid #fff' }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.mbuNumber || s.mbuName || 'No MBU'}{isHub ? ' · HUB' : ''}{isSolar ? ' · ⚡Solar' : ''}</div>
                    </div>
                    <MapPin size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </button>
                );
              })}
              {searchResults.length >= 8 && <div style={{ padding: '5px 14px', fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>Type more to narrow results…</div>}
            </div>
          )}
        </div>

        {/* MBU Filter */}
        <select value={selectedMbu} onChange={e => handleMbuChange(e.target.value)}
          style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', flex: '1 1 140px' }}>
          <option value="ALL">All MBUs ({sites.length} sites)</option>
          {mbuList.map(mbu => <option key={mbu} value={mbu}>{mbu} ({sitesByMbu.get(mbu)?.length ?? 0})</option>)}
        </select>

        {/* Boundaries Toggle */}
        <button onClick={() => setShowBoundaries(b => !b)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, background: showBoundaries ? 'var(--accent)' : 'var(--surface)', color: showBoundaries ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
          title="Toggle MBU Boundaries">
          <Layers size={14} /> {showBoundaries ? 'Boundaries ON' : 'Boundaries OFF'}
        </button>

        {/* Style switcher (shown if Mapbox token is present) */}
        {token && !useFreeOsm ? (
          <div style={{ display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            {(Object.keys(STYLES) as StyleKey[]).map(k => (
              <button key={k} onClick={() => setActiveStyle(k)}
                style={{ padding: '5px 9px', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700, background: activeStyle === k ? 'var(--accent)' : 'transparent', color: activeStyle === k ? '#fff' : 'var(--text-muted)', cursor: 'pointer', border: 'none' }}>
                {k === 'satellite' ? 'Sat' : k === 'dark' ? 'Dark' : 'Street'}
              </button>
            ))}
          </div>
        ) : (
          <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>OSM Mode</span>
        )}

        {/* Token key button */}
        <button
          onClick={() => setShowTokenModal(true)}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
          title="Configure Mapbox Token"
        >
          <Key size={14} />
        </button>
      </div>

      {/* ── MAP CANVAS ── */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* ── RIGHT UTILITY BUTTONS ── */}
      <div style={{ position: 'absolute', bottom: '24px', right: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button onClick={handleLocate} disabled={isLocating} className="glass" style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: 'var(--accent)', cursor: 'pointer' }} title="My Location">
          <Navigation size={18} style={{ transform: isLocating ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} />
        </button>
        <button onClick={() => mapRef.current?.zoomIn()} className="glass" style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', cursor: 'pointer' }}>
          <ZoomIn size={18} />
        </button>
        <button onClick={() => mapRef.current?.zoomOut()} className="glass" style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', cursor: 'pointer' }}>
          <ZoomOut size={18} />
        </button>
      </div>

      {/* ── STATUS BAR ── */}
      <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 10, background: 'rgba(10,15,12,0.82)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
        {filteredSites.length} of {sites.length} sites
        {selectedMbu !== 'ALL' && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>• {selectedMbu}</span>}
      </div>

      {/* ── TOKEN CONFIG MODAL ── */}
      {showTokenModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass" style={{ width: '100%', maxWidth: '380px', padding: '20px', borderRadius: '14px', border: '1px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Mapbox Token Setup</h3>
              <button onClick={() => setShowTokenModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
              Paste your Mapbox Public Token to enable high-resolution satellite imagery.
            </p>
            <input
              className="input"
              style={{ width: '100%', fontSize: '0.82rem', padding: '8px 12px', marginBottom: '10px' }}
              placeholder="pk.eyJ1..."
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-accent" style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem' }} onClick={() => handleSaveToken(tokenInput)} disabled={!tokenInput.trim()}>
                Save Token
              </button>
              <button className="btn-ghost" style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem' }} onClick={handleUseFreeOsm}>
                Use Free OSM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SITE DETAIL POPUP ── */}
      {selectedSite && (
        <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, width: '92%', maxWidth: '460px', animation: 'slideUp 0.25s ease' }}>
          <div className="glass" style={{ padding: '16px 18px', border: '1px solid var(--accent)', boxShadow: '0 16px 36px rgba(0,0,0,0.6)', position: 'relative' }}>
            <button onClick={() => setSelectedSite(null)} style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <X size={18} />
            </button>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span className="badge" style={{ background: 'var(--accent)', color: '#fff' }}>{selectedSite.mbuNumber || 'NO MBU'}</span>
              {selectedSite.siteStatus && <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>{selectedSite.siteStatus}</span>}
              {selectedSite.solar?.toLowerCase() === 'yes' && <span className="badge" style={{ background: 'rgba(234,179,8,0.15)', color: '#facc15', display: 'flex', alignItems: 'center', gap: '3px' }}><Sun size={11} /> Solar</span>}
              {selectedSite.dgStatus && selectedSite.dgStatus !== '-' && <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '3px' }}><Zap size={11} /> DG: {selectedSite.dgStatus}</span>}
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 2px', color: 'var(--text-primary)' }}>{selectedSite.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '0 0 10px' }}>
              📍 {selectedSite.lat.toFixed(6)}, {selectedSite.lng.toFixed(6)} · {selectedSite.mbuName || 'Unassigned'}
            </p>

            {/* Key metadata grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '10px', fontSize: '0.76rem' }}>
              {[
                ['Jazz', selectedSite.jazzId],
                ['Telenor', selectedSite.telenorId],
                ['Zong', selectedSite.zongId],
                ['Ufone', selectedSite.ufoneId],
                ['DG Status', selectedSite.dgStatus],
                ['DG Shared', selectedSite.dgShared],
                ['Power', selectedSite.powerStatus],
                ['Network', selectedSite.networkPortfolio],
              ].filter(([, v]) => v && v !== '-' && v !== '').map(([label, val]) => (
                <div key={label} style={{ background: 'var(--accent-bg)', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.66rem', display: 'block' }}>{label}</span>
                  <strong style={{ fontFamily: 'monospace' }}>{val}</strong>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-accent" onClick={() => window.open(`https://maps.google.com/?q=${selectedSite.lat},${selectedSite.lng}`, '_blank')} style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <ExternalLink size={14} /> Navigate
              </button>
              {selectedSite.cellNumber && (
                <button className="btn-whatsapp" onClick={() => {
                  let ph = selectedSite.cellNumber.replace(/\D/g, '');
                  if (ph.startsWith('0')) ph = '92' + ph.slice(1);
                  else if (!ph.startsWith('92')) ph = '92' + ph;
                  window.open(`https://wa.me/${ph}?text=${encodeURIComponent(`Hi ${selectedSite.mbuName}, regarding Site ${selectedSite.name}`)}`, '_blank');
                }} style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <MessageSquare size={14} /> WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

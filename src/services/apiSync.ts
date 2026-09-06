import { analyticsData as defaultAnalyticsData } from '../analyticsData';

const STORAGE_KEY = 'engro_telemetry_cache_v1';
const LAST_SYNC_KEY = 'engro_last_sync_time';

// Securely embedded enterprise key matching the web portal database
const SECURE_PORTAL_API_KEY = 'engro_live_c4_telecom_secret_2026';

// Portal sync endpoints (Production cloud + local fallback)
const PRODUCTION_PORTAL_URL = 'https://engro.vercel.app/api/v1/sync';
const LOCAL_DEV_PORTAL_URL = 'http://localhost:3001/api/v1/sync';

type TelemetryListener = (data: any, info: { source: string; syncTime: string; isLive: boolean; error?: string }) => void;
const listeners: Set<TelemetryListener> = new Set();

export function subscribeTelemetry(listener: TelemetryListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(data: any, info: { source: string; syncTime: string; isLive: boolean; error?: string }) {
  listeners.forEach(fn => {
    try {
      fn(data, info);
    } catch (e) {
      console.warn('Telemetry listener error:', e);
    }
  });
}

export function getCachedTelemetry(): any {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && (parsed.nar || parsed.sites)) {
        return {
          ...defaultAnalyticsData,
          ...parsed,
          nar: {
            ...defaultAnalyticsData.nar,
            ...(parsed.nar || {})
          },
          fuel: {
            ...defaultAnalyticsData.fuel,
            ...(parsed.fuel || {})
          }
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached telemetry:', e);
  }
  return defaultAnalyticsData;
}

export function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch (_) {
    return null;
  }
}

/**
 * Automatically & silently syncs the latest telemetry from the Engro Data Portal
 * when online. No user interaction or configuration required.
 */
export async function fetchLiveTelemetry(): Promise<{ 
  success: boolean; 
  data: any; 
  source: 'PORTAL_API' | 'LOCAL_CACHE' | 'EMBEDDED'; 
  syncTime: string;
  error?: string 
}> {
  const endpoints = [
    `${PRODUCTION_PORTAL_URL}?_t=${Date.now()}`,
    `${LOCAL_DEV_PORTAL_URL}?_t=${Date.now()}`
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'x-engro-api-key': SECURE_PORTAL_API_KEY,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const payload = await res.json();
        if (payload && (payload.nar || payload.summary)) {
          // Merge with defaults to ensure complete schema compatibility
          const merged = {
            ...defaultAnalyticsData,
            ...payload,
            nar: {
              ...defaultAnalyticsData.nar,
              ...(payload.nar || {})
            },
            fuel: {
              ...defaultAnalyticsData.fuel,
              ...(payload.fuel || {})
            }
          };

          const now = new Date().toISOString();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          localStorage.setItem(LAST_SYNC_KEY, now);

          notifyListeners(merged, { source: 'PORTAL_API', syncTime: now, isLive: true });
          return { success: true, data: merged, source: 'PORTAL_API', syncTime: now };
        }
      }
    } catch (_) {
      // Try next endpoint
    }
  }

  // Fallback to local cache or embedded default
  const cached = getCachedTelemetry();
  const lastTime = getLastSyncTime() || new Date().toISOString();
  const isCache = cached !== defaultAnalyticsData;
  
  notifyListeners(cached, {
    source: isCache ? 'LOCAL_CACHE' : 'EMBEDDED',
    syncTime: lastTime,
    isLive: false,
    error: 'Offline mode active - using cached telemetry'
  });

  return {
    success: false,
    data: cached,
    source: isCache ? 'LOCAL_CACHE' : 'EMBEDDED',
    syncTime: lastTime,
    error: 'Offline mode active'
  };
}

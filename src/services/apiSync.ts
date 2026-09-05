import { analyticsData as defaultAnalyticsData } from '../analyticsData';

const STORAGE_KEY = 'engro_telemetry_cache_v1';
const LAST_SYNC_KEY = 'engro_last_sync_time';

// Securely embedded enterprise key matching the web portal database
const SECURE_PORTAL_API_KEY = 'engro_live_c4_telecom_secret_2026';

// Portal sync endpoints (Production cloud + local fallback)
const PRODUCTION_PORTAL_URL = 'https://engro.vercel.app/api/v1/sync';
const LOCAL_DEV_PORTAL_URL = 'http://localhost:3001/api/v1/sync';

export function getCachedTelemetry(): any {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.nar) {
        return parsed;
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
  error?: string 
}> {
  const endpoints = [PRODUCTION_PORTAL_URL, LOCAL_DEV_PORTAL_URL];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

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
        if (payload && payload.nar) {
          // Cache fresh data locally for instant offline performance
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
          localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
          return { success: true, data: payload, source: 'PORTAL_API' };
        }
      }
    } catch (_) {
      // Try next endpoint or fall back
    }
  }

  // Seamless fallback to cached or embedded telemetry
  const cached = getCachedTelemetry();
  return {
    success: false,
    data: cached,
    source: cached !== defaultAnalyticsData ? 'LOCAL_CACHE' : 'EMBEDDED',
    error: 'Offline mode active'
  };
}

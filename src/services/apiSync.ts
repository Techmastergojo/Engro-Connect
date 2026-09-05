import { analyticsData as defaultAnalyticsData } from '../analyticsData';

const STORAGE_KEY = 'engro_telemetry_cache_v1';
const CONFIG_KEY = 'engro_portal_api_config';

export interface PortalApiConfig {
  endpoint: string;
  apiKey: string;
  autoSync: boolean;
  lastSyncTimestamp?: string;
}

export const DEFAULT_CONFIG: PortalApiConfig = {
  endpoint: 'http://localhost:3001/api/v1/sync',
  apiKey: 'engro_live_c4_telecom_secret_2026',
  autoSync: true
};

export function getPortalConfig(): PortalApiConfig {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch (e) {
    console.warn('Failed to load portal config:', e);
  }
  return DEFAULT_CONFIG;
}

export function savePortalConfig(config: Partial<PortalApiConfig>) {
  try {
    const current = getPortalConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save portal config:', e);
    return DEFAULT_CONFIG;
  }
}

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

export async function fetchLiveTelemetry(): Promise<{ success: boolean; data: any; source: 'PORTAL_API' | 'LOCAL_CACHE' | 'EMBEDDED'; error?: string }> {
  const config = getPortalConfig();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(config.endpoint, {
      method: 'GET',
      headers: {
        'x-engro-api-key': config.apiKey,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Portal API responded with status ${res.status}`);
    }

    const payload = await res.json();
    if (payload && payload.nar) {
      // Cache successful response
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      savePortalConfig({ lastSyncTimestamp: new Date().toISOString() });
      return { success: true, data: payload, source: 'PORTAL_API' };
    }
    throw new Error('Invalid payload schema received from portal');
  } catch (err: any) {
    console.warn('Live sync fallback to cache/embedded:', err?.message);
    const cached = getCachedTelemetry();
    return {
      success: false,
      data: cached,
      source: cached !== defaultAnalyticsData ? 'LOCAL_CACHE' : 'EMBEDDED',
      error: err?.message || 'Network sync failed'
    };
  }
}

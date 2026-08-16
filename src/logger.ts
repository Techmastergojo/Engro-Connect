export interface OtaLog {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

const STORAGE_KEY = 'engro_ota_logs';

export const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
  try {
    const logs = getLogs();
    const newLog: OtaLog = {
      timestamp: new Date().toISOString(),
      message,
      type
    };
    logs.unshift(newLog); // Add to beginning
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.length = 100;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    console.log(`[OTA LOG] ${type.toUpperCase()}: ${message}`);
  } catch (e) {
    console.error('Failed to write log', e);
  }
};

export const getLogs = (): OtaLog[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const clearLogs = () => {
  localStorage.removeItem(STORAGE_KEY);
};

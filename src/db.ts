import type { Site } from './types';
import { defaultSites } from './defaultData';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import Papa from 'papaparse';

const DB_KEY = 'coordinate_helper_sites';
const BACKUP_FILE = 'CoordinateHelperBackup.csv';
const DATA_VERSION_KEY = 'coordinate_helper_data_version';
const CURRENT_DATA_VERSION = 'Deodar-GRW1'; // bump this whenever you replace site data

const backupToCsv = async (sites: Site[]) => {
  try {
    const csvContent = 'Site ID,Latitude,Longitude\n' + sites.map(s => `"${s.name}",${s.lat},${s.lng}`).join('\n');
    await Filesystem.writeFile({
      path: BACKUP_FILE,
      data: csvContent,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
  } catch (error) {
    console.error('Failed to backup to CSV:', error);
  }
};

export const getSites = (): Site[] => {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveSites = (sites: Site[]) => {
  localStorage.setItem(DB_KEY, JSON.stringify(sites));
  backupToCsv(sites); // Fire and forget backup
};

export const initializeDb = async (): Promise<Site[]> => {
  // If data version changed, wipe old sites so new defaults load cleanly
  const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
  if (storedVersion !== CURRENT_DATA_VERSION) {
    localStorage.removeItem(DB_KEY);
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
  }

  const data = localStorage.getItem(DB_KEY);
  if (data && JSON.parse(data).length > 0) {
    return JSON.parse(data);
  }

  // If local storage is empty, try to restore from CSV backup
  try {
    const contents = await Filesystem.readFile({
      path: BACKUP_FILE,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    if (typeof contents.data === 'string') {
      const results = Papa.parse(contents.data, { header: true, skipEmptyLines: true });
      const restoredSites = results.data.map((row: any) => {
        const name = row['Site ID'] || row.name || row.Name || row.location || row.Location || '';
        const lat = parseFloat((row.Latitude || row.lat || row.latitude || row.Lat || '0').toString().replace(/\.\./g, '.'));
        const lng = parseFloat((row.Longitude || row.lng || row.longitude || row.Lng || '0').toString().replace(/\.\./g, '.'));
        if (name && !isNaN(lat) && !isNaN(lng)) {
          return { id: crypto.randomUUID(), name, lat, lng, createdAt: Date.now() };
        }
        return null;
      }).filter(Boolean) as Site[];

      if (restoredSites.length > 0) {
        saveSites(restoredSites);
        return restoredSites;
      }
    }
  } catch (error) {
    console.log('No backup found, using default data.', error);
  }

  // Fallback to initial defaults if no backup exists
  saveSites(defaultSites);
  return defaultSites;
};

export const addSite = (site: Omit<Site, 'id' | 'createdAt'>): Site => {
  const sites = getSites();
  const newSite: Site = { ...site, id: crypto.randomUUID(), createdAt: Date.now() };
  sites.unshift(newSite);
  saveSites(sites);
  return newSite;
};

export const updateSite = (id: string, updates: Partial<Site>) => {
  const sites = getSites();
  const index = sites.findIndex((s) => s.id === id);
  if (index !== -1) {
    sites[index] = { ...sites[index], ...updates };
    saveSites(sites);
  }
};

export const deleteSite = (id: string) => {
  const sites = getSites();
  const filtered = sites.filter((s) => s.id !== id);
  saveSites(filtered);
};

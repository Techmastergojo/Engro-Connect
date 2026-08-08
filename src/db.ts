import type { Site } from './types';
import { defaultSites } from './defaultData';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import Papa from 'papaparse';

const DB_KEY = 'engro_connect_sites';
const BACKUP_FILE = 'EngroConnectBackup.csv';
const DATA_VERSION_KEY = 'engro_connect_data_version';
const CURRENT_DATA_VERSION = 'Engro-Connect-v2'; // bump this whenever you replace site data

const backupToCsv = async (sites: Site[]) => {
  try {
    const csvContent = 'Site ID,Latitude,Longitude,MBU Number,MBU Name,Cell Number,Network portofolio,Zonal Manager,Jazz id,Telenor id,Zong id,Ufone id\n' +
      sites.map(s => `"${s.name}",${s.lat},${s.lng},"${s.mbuNumber}","${s.mbuName}","${s.cellNumber}","${s.networkPortfolio}","${s.zonalManager}","${s.jazzId}","${s.telenorId}","${s.zongId}","${s.ufoneId}"`).join('\n');
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
        const name = row['Site ID'] || row.name || row.Name || '';
        const lat = parseFloat((row.Latitude || row.lat || '0').toString().replace(/\.\./g, '.'));
        const lng = parseFloat((row.Longitude || row.lng || '0').toString().replace(/\.\./g, '.'));
        if (name && !isNaN(lat) && !isNaN(lng)) {
          return {
            id: crypto.randomUUID(), name, lat, lng,
            mbuNumber: row['MBU Number'] || '',
            mbuName: row['MBU Name'] || '',
            cellNumber: row['Cell Number'] || '',
            networkPortfolio: row['Network portofolio'] || '',
            zonalManager: row['Zonal Manager'] || '',
            jazzId: row['Jazz id'] || '',
            telenorId: row['Telenor id'] || '',
            zongId: row['Zong id'] || '',
            ufoneId: row['Ufone id'] || '',
            createdAt: Date.now()
          };
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

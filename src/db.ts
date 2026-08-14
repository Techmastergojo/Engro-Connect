import type { Site } from './types';
import { defaultSites } from './defaultData';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const DB_KEY = 'engro_connect_sites';
const DATA_VERSION_KEY = 'engro_connect_data_version';
const CURRENT_DATA_VERSION = 'Engro-Connect-v12';

// Two backup locations for maximum durability:
// 1. ExternalStorage = Downloads/ folder → survives UNINSTALL (needs permission)
// 2. External = app's SD card folder → survives UPDATES (no permission needed)
const BACKUP_FILENAME = 'EngroConnect_backup.csv';

// ── CSV helpers ──────────────────────────────────────────────────────────────
const sitesToCsv = (sites: Site[]): string => {
  const header = 'Site ID,Latitude,Longitude,MBU Number,MBU Name,Cell Number,Network portofolio,Zonal Manager,Jazz id,Telenor id,Zong id,Ufone id,Site status,Category,Power status,Security Vendor,Guest OMO,DG shared,DC shared,Solar,DG status,Dependent sites,Solar KWA,NE location,No of Sites,DC Shared With,Ufone Approved Services,TP ID,TP Approved Services,Zong Approved Services,Jazz Approved Services,isUserCreated';
  const rows = sites.map(s =>
    `"${s.name}",${s.lat},${s.lng},"${s.mbuNumber}","${s.mbuName}","${s.cellNumber}","${s.networkPortfolio}","${s.zonalManager}","${s.jazzId}","${s.telenorId}","${s.zongId}","${s.ufoneId}","${s.siteStatus || ''}","${s.category || ''}","${s.powerStatus || ''}","${s.securityVendor || ''}","${s.guestOmo || ''}","${s.dgShared || ''}","${s.dcShared || ''}","${s.solar || ''}","${s.dgStatus || ''}","${s.dependentSites || ''}","${s.solarKwa || ''}","${s.neLocation || ''}","${s.noOfSites || ''}","${s.dcSharedWith || ''}","${s.ufoneApprovedServices || ''}","${s.tpId || ''}","${s.tpApprovedServices || ''}","${s.zongApprovedServices || ''}","${s.jazzApprovedServices || ''}",${s.isUserCreated ? 'true' : 'false'}`
  );
  return [header, ...rows].join('\n');
};

// ── Silent auto-backup (fire & forget) ──────────────────────────────────────
const autoBackup = async (sites: Site[]) => {
  const csv = sitesToCsv(sites);

  // Backup 1: App's external SD card directory (survives updates)
  try {
    await Filesystem.writeFile({
      path: BACKUP_FILENAME,
      data: csv,
      directory: Directory.External,
      encoding: Encoding.UTF8,
    });
  } catch (_) { /* silent */ }

  // Backup 2: Downloads folder (survives uninstall — needs WRITE_EXTERNAL_STORAGE)
  try {
    await Filesystem.writeFile({
      path: `Download/${BACKUP_FILENAME}`,
      data: csv,
      directory: Directory.ExternalStorage,
      encoding: Encoding.UTF8,
    });
  } catch (_) { /* silent — permission may not be granted, that's OK */ }
};

// ── Public API ───────────────────────────────────────────────────────────────
export const getSites = (): Site[] => {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveSites = (sites: Site[]) => {
  localStorage.setItem(DB_KEY, JSON.stringify(sites));
  autoBackup(sites); // fire & forget — always runs silently in background
};

export const initializeDb = async (): Promise<Site[]> => {
  const forceCleanKey = 'force_clean_db_v12';
  const hasForceCleaned = localStorage.getItem(forceCleanKey);

  if (!hasForceCleaned) {
    // Force reset to new CSV dataset for all existing installations
    localStorage.setItem(forceCleanKey, 'true');
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
    saveSites(defaultSites);
    return defaultSites;
  }

  const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
  const isVersionChange = storedVersion !== CURRENT_DATA_VERSION;

  if (isVersionChange) {
    // Version changed → wipe previous local storage and load fresh dataset exclusively from CSV
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
    saveSites(defaultSites);
    return defaultSites;
  }

  // Same version → check if local storage has data
  const data = localStorage.getItem(DB_KEY);
  if (data && JSON.parse(data).length > 0) {
    return JSON.parse(data);
  }

  // Fallback: load default sites
  localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
  saveSites(defaultSites);
  return defaultSites;
};

export const addSite = (site: Omit<Site, 'id' | 'createdAt'>): Site => {
  const sites = getSites();
  const newSite: Site = { ...site, id: crypto.randomUUID(), createdAt: Date.now(), isUserCreated: true };
  sites.unshift(newSite);
  saveSites(sites);
  return newSite;
};

export const updateSite = (id: string, updates: Partial<Site>) => {
  const sites = getSites();
  const index = sites.findIndex(s => s.id === id);
  if (index !== -1) {
    // Preserve isUserCreated flag on update
    sites[index] = { ...sites[index], ...updates, isUserCreated: sites[index].isUserCreated };
    saveSites(sites);
  }
};

export const deleteSite = (id: string) => {
  const sites = getSites().filter(s => s.id !== id);
  saveSites(sites);
};

export const saveSitesPublic = saveSites; // alias for App.tsx CSV import

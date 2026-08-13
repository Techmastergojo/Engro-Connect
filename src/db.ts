import type { Site } from './types';
import { defaultSites } from './defaultData';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import Papa from 'papaparse';

const DB_KEY = 'engro_connect_sites';
const DATA_VERSION_KEY = 'engro_connect_data_version';
const CURRENT_DATA_VERSION = 'Engro-Connect-v8';

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

const parseCsvRow = (row: any): Site | null => {
  const name = row['Site ID'] || row.name || row.Name || '';
  const lat = parseFloat((row.Latitude || row.lat || '0').toString().replace(/\.\./g, '.'));
  const lng = parseFloat((row.Longitude || row.lng || '0').toString().replace(/\.\./g, '.'));
  if (!name || isNaN(lat) || isNaN(lng)) return null;
  const depSites = row['Dependent site'] || row['Dependent sites'] || row.dependentSites || row['No of Sites'] || row.noOfSites || undefined;
  return {
    id: row.id || crypto.randomUUID(),
    name, lat, lng,
    mbuNumber: row['MBU Number'] || '',
    mbuName: row['MBU Name'] || '',
    cellNumber: row['Cell Number'] || '',
    networkPortfolio: row['Network portofolio'] || row['Network Portfolio'] || '',
    zonalManager: row['Zonal Manager'] || '',
    jazzId: row['Jazz id'] || '',
    telenorId: row['Telenor id'] || '',
    zongId: row['Zong id'] || row['ZONG ID'] || '',
    ufoneId: row['Ufone id'] || row['Ufone ID'] || '',
    siteStatus: row['Site status'] || row.siteStatus || undefined,
    category: row['Category'] || row.category || undefined,
    powerStatus: row['Power status'] || row.powerStatus || undefined,
    securityVendor: row['Security Vendor'] || row.securityVendor || undefined,
    guestOmo: row['Guest OMOs'] || row['Guest OMO'] || row.guestOmo || undefined,
    dgShared: row['DG shared '] || row['DG shared'] || row.dgShared || undefined,
    dcShared: row['DC shared'] || row.dcShared || undefined,
    solar: row['Solar'] || row.solar || undefined,
    dgStatus: row['DG status'] || row.dgStatus || undefined,
    dependentSites: depSites,
    solarKwa: row['Solar KWA'] || row.solarKwa || undefined,
    neLocation: row['NE location'] || row.neLocation || undefined,
    noOfSites: row['No of Sites'] || row.noOfSites || depSites || undefined,
    dcSharedWith: row['DC Shared With'] || row.dcSharedWith || undefined,
    ufoneApprovedServices: row['Ufone Approved Services'] || row.ufoneApprovedServices || undefined,
    tpId: row['TP ID'] || row.tpId || undefined,
    tpApprovedServices: row['TP Approved Services'] || row.tpApprovedServices || undefined,
    zongApprovedServices: row['Zong Approved Services'] || row.zongApprovedServices || undefined,
    jazzApprovedServices: row['Jazz Approved Services'] || row.jazzApprovedServices || undefined,
    createdAt: row.createdAt ? parseInt(row.createdAt) : Date.now(),
    isUserCreated: row.isUserCreated === 'true' || row.isUserCreated === true,
  };
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

// ── Read backup from either location ────────────────────────────────────────
const readBackup = async (): Promise<Site[] | null> => {
  // Try Downloads first (most durable)
  for (const loc of [
    { path: `Download/${BACKUP_FILENAME}`, dir: Directory.ExternalStorage },
    { path: BACKUP_FILENAME, dir: Directory.External },
  ]) {
    try {
      const contents = await Filesystem.readFile({ path: loc.path, directory: loc.dir, encoding: Encoding.UTF8 });
      if (typeof contents.data === 'string' && contents.data.length > 50) {
        const result = Papa.parse(contents.data, { header: true, skipEmptyLines: true });
        const sites = result.data.map((row: any) => parseCsvRow(row)).filter(Boolean) as Site[];
        if (sites.length > 0) return sites;
      }
    } catch (_) { /* try next */ }
  }
  return null;
};

// ── Smart merge: user sites always win ───────────────────────────────────────
const smartMerge = (freshDefaults: Site[], backupSites: Site[]): Site[] => {
  // Pull out only user-created sites from backup
  const userSites = backupSites.filter(s => s.isUserCreated);
  const userNames = new Set(userSites.map(s => s.name.toLowerCase()));

  // Filter out from defaults any site already in user's custom list (avoid duplicates)
  const filteredDefaults = freshDefaults.filter(s => !userNames.has(s.name.toLowerCase()));

  // User sites go at the top
  return [...userSites, ...filteredDefaults];
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
  const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
  const isVersionChange = storedVersion !== CURRENT_DATA_VERSION;

  if (isVersionChange) {
    // Version changed → load fresh defaults BUT rescue any user-created sites first
    const oldData = localStorage.getItem(DB_KEY);
    const oldSites: Site[] = oldData ? JSON.parse(oldData) : [];
    const userSites = oldSites.filter(s => s.isUserCreated);

    // Also check backup files for any user sites we might have missed
    const backupSites = await readBackup();
    const backupUserSites = backupSites ? backupSites.filter(s => s.isUserCreated) : [];

    // Combine user sites from both sources (deduplicate by name)
    const allUserSites = [...userSites];
    const userNames = new Set(userSites.map(s => s.name.toLowerCase()));
    for (const s of backupUserSites) {
      if (!userNames.has(s.name.toLowerCase())) allUserSites.push(s);
    }

    const merged = smartMerge(defaultSites, allUserSites);
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
    saveSites(merged);
    return merged;
  }

  // Same version → check if local storage has data
  const data = localStorage.getItem(DB_KEY);
  if (data && JSON.parse(data).length > 0) {
    return JSON.parse(data);
  }

  // localStorage empty (fresh install or cleared) → try restoring from backup
  const backupSites = await readBackup();
  if (backupSites && backupSites.length > 0) {
    const merged = smartMerge(defaultSites, backupSites);
    saveSites(merged);
    return merged;
  }

  // Absolute fallback: load default sites
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

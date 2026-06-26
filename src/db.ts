import type { Site } from './types';
import { defaultSites } from './defaultData';

const DB_KEY = 'coordinate_helper_sites';

export const getSites = (): Site[] => {
  const data = localStorage.getItem(DB_KEY);
  if (data) {
    return JSON.parse(data);
  }
  
  // If no data exists, initialize with default sites from KML.csv
  saveSites(defaultSites);
  return defaultSites;
};

export const saveSites = (sites: Site[]) => {
  localStorage.setItem(DB_KEY, JSON.stringify(sites));
};

export const addSite = (site: Omit<Site, 'id' | 'createdAt'>): Site => {
  const sites = getSites();
  const newSite: Site = {
    ...site,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  sites.push(newSite);
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

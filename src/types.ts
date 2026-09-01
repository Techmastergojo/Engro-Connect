export interface Site {
  id: string;
  name: string;
  lat: number;
  lng: number;
  mbuNumber: string;
  mbuName: string;
  cellNumber: string;
  networkPortfolio: string;
  zonalManager: string;
  jazzId: string;
  telenorId: string;
  zongId: string;
  ufoneId: string;
  siteStatus?: string;
  category?: string;
  powerStatus?: string;
  securityVendor?: string;
  guestOmo?: string;
  dgShared?: string;
  dcShared?: string;
  solar?: string;
  dgStatus?: string;
  dependentSites?: string;
  noOfSites?: string;
  solarKwa?: string;
  neLocation?: string;
  dcSharedWith?: string;
  ufoneApprovedServices?: string;
  tpId?: string;
  tpApprovedServices?: string;
  zongApprovedServices?: string;
  jazzApprovedServices?: string;
  createdAt: number;
  isUserCreated?: boolean; // true = added by user, survives all app updates
}

export interface NarSite {
  code: string;
  name: string;
  mbu: string;
  avgNar: number;
  daily: Record<string, number>;
}

export interface OutageCategory {
  reason: string;
  domain: string;
}

export interface FuelDailySummary {
  date: string;
  scratching: number;
  pouring: number;
  inhand: number;
}

export interface VehicleFuel {
  vehicleNo: string;
  fsoName: string;
  area: string;
  mbu: string;
  totalFuel: number;
  daily: Record<string, number>;
}

export interface PouringLog {
  siteCode: string;
  siteName: string;
  mbu: string;
  vendor: string;
  siteStatus: string;
  visitNature: string;
  date: string;
  fuelBal: number;
  fuelPoured: number;
  vehicleNo: string;
  createdBy: string;
}

export interface ScratchingLog {
  cardCode: string;
  fuelCompany: string;
  vendor: string;
  cardName: string;
  cardNumber: string;
  cardLimit: number;
  mbu: string;
  region: string;
  date: string;
  quantity: number;
  station: string;
}

export interface SiteDgProfile {
  siteCode: string;
  siteName: string;
  mbu: string;
  flmVendor: string;
  secVendor: string;
  dgKva: string;
  engineBrand: string;
  dgBrand: string;
  consumptionFactor: number | null;
}

export interface SiteFuelSummary {
  siteCode: string;
  siteName: string;
  mbu: string;
  totalPoured: number;
  visitsCount: number;
  lastVisitDate: string;
  lastFuelBal: number;
  dgProfile: SiteDgProfile | null;
}




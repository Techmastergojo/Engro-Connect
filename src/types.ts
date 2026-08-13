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
  createdAt: number;
  isUserCreated?: boolean; // true = added by user, survives all app updates
}




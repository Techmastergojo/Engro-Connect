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
  createdAt: number;
  isUserCreated?: boolean; // true = added by user, survives all app updates
}

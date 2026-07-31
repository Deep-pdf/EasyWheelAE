import { Sector } from './Sector';

export interface Profile {
  name: string;
  application: string;
  sectorCount: number;
  sectors: Sector[];
  lastModified: string;
}

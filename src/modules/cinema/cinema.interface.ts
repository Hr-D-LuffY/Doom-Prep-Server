export interface CreateCinemaInput {
  name: string;
  bundleSizes: number[];
}

export interface CinemaResponse {
  id: number;
  name: string;
  bundleSizes: number[];
}

export interface DeleteCinemaResponse {
  message: string;
  id: number;
}

export interface BookingItem {
  size: number;
  count: number;
}

export interface BookingPossible {
  possible: true;
  groupSize: number;
  totalBundles: number;
  breakdown: BookingItem[];
}

export interface BookingImpossible {
  possible: false;
  groupSize: number;
}

export type BookingResponse = BookingPossible | BookingImpossible;

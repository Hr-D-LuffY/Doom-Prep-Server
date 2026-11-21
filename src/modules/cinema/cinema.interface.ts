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

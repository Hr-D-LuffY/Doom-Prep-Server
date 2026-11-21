export interface CreateMovieInput {
  title: string;
  releaseYear: number;
  runtime: number;
  prerequisites: number[];
  watched: boolean;
}

export interface MovieResponse {
  id: number;
  title: string;
  releaseYear: number;
  runtime: number;
  watched: boolean;
  prerequisites: number[];
}

export interface MovieWithLinks {
  id: number;
  title: string;
  releaseYear: number;
  runtime: number;
  watched: boolean;
  prerequisites: { prerequisiteId: number }[];
}

export interface UpdateMovieInput {
  title?: string;
  releaseYear?: number;
  runtime?: number;
  watched?: boolean;
  prerequisites?: number[];
}

export type PrerequisiteGraph = Map<number, number[]>;

export interface RewatchItem {
  id: number;
  title: string;
  runtime: number;
  watched: boolean;
}

export interface RewatchOrderResponse {
  target: { id: number; title: string };
  order: RewatchItem[];
  totalCount: number;
  watchedCount: number;
  remainingMinutes: number;
}

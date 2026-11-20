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

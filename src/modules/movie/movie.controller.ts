import type { Request, Response } from "express";
import * as movieService from "./movie.service";
import { validateCreateMovies, validateId, validateUpdateMovie } from "./movie.validation";

export const createMovie = async (req: Request, res: Response) => {
  const isBatch = Array.isArray(req.body);
  const inputs = validateCreateMovies(req.body);
  const created = await movieService.createMovies(inputs);
  res.status(201).json(isBatch ? created : created[0]);
};

export const getMovies = async (req: Request, res: Response) => {
  const movies = await movieService.getMovies();
  res.json(movies);
};

export const getMovieById = async (req: Request, res: Response) => {
  const movie = await movieService.getMovieById(validateId(req.params.id));
  res.json(movie);
};

export const updateMovie = (async (req: Request, res: Response) => {
  const id = validateId(req.params.id);
  const input = validateUpdateMovie(req.body);
  const movie = await movieService.updateMovie(id, input);
  res.json(movie);
});

export const deleteMovie = (async (req: Request, res: Response) => {
  await movieService.deleteMovie(validateId(req.params.id));
  res.status(204).send();
});
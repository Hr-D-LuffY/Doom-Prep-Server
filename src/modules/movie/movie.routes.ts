import { Router } from "express";
import {
  createMovie,
  deleteMovie,
  getMovieById,
  getMovies,
  updateMovie,
} from "./movie.controller";

export const movieRoutes = Router();

movieRoutes.post("/", createMovie);
movieRoutes.get("/", getMovies);
movieRoutes.get("/:id", getMovieById);
movieRoutes.patch("/:id", updateMovie);
movieRoutes.delete("/:id", deleteMovie);

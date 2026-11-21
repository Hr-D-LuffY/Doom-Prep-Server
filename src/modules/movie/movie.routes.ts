import { Router } from "express";
import {
  createMovie,
  deleteMovie,
  getMovieById,
  getMovies,
  getRewatchOrder,
  updateMovie,
} from "./movie.controller";

export const movieRoutes = Router();

movieRoutes.post("/", createMovie);
movieRoutes.get("/", getMovies);
movieRoutes.get("/:id", getMovieById);
movieRoutes.get("/:id/rewatch-order", getRewatchOrder);
movieRoutes.patch("/:id", updateMovie);
movieRoutes.delete("/:id", deleteMovie);

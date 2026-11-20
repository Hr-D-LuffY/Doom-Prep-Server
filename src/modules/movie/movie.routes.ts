import { Router } from "express";
import { createMovie, getMovieById, getMovies } from "./movie.controller";

export const movieRoutes = Router();

movieRoutes.post("/", createMovie);
movieRoutes.get("/", getMovies);
movieRoutes.get("/:id", getMovieById);

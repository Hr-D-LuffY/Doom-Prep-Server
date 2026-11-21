import { Router } from "express";
import {
  createCinema,
  deleteCinema,
  getCinemaById,
  getCinemas,
} from "./cinema.controller";

export const cinemaRoutes = Router();

cinemaRoutes.post("/", createCinema);
cinemaRoutes.get("/", getCinemas);
cinemaRoutes.get("/:id", getCinemaById);
cinemaRoutes.delete("/:id", deleteCinema);

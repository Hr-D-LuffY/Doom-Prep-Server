import { Router } from "express";
import {
  createCinema,
  deleteCinema,
  getBookingQuote,
  getCinemaById,
  getCinemas,
} from "./cinema.controller";

export const cinemaRoutes = Router();

cinemaRoutes.post("/", createCinema);
cinemaRoutes.get("/", getCinemas);
cinemaRoutes.get("/:id", getCinemaById);
cinemaRoutes.get("/:id/booking", getBookingQuote);
cinemaRoutes.delete("/:id", deleteCinema);

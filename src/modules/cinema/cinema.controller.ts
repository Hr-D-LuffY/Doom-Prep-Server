import type { Request, Response } from "express";
import { validateId } from "../../lib/validators";
import * as cinemaService from "./cinema.service";
import { validateCreateCinemas } from "./cinema.validation";

export const createCinema = async (req: Request, res: Response) => {
  const isBatch = Array.isArray(req.body);
  const inputs = validateCreateCinemas(req.body);
  const created = await cinemaService.createCinemas(inputs);
  res.status(201).json(isBatch ? created : created[0]);
};

export const getCinemas = async (req: Request, res: Response) => {
  const cinemas = await cinemaService.getCinemas();
  res.json(cinemas);
};

export const getCinemaById = async (req: Request, res: Response) => {
  const cinema = await cinemaService.getCinemaById(validateId(req.params.id));
  res.json(cinema);
};
export const deleteCinema = async (req: Request, res: Response) => {
  const id = validateId(req.params.id);
  await cinemaService.deleteCinema(id);
  res.status(200).json({ message: "Cinema deleted successfully", id });
};

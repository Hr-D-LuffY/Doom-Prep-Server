import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { calculateBooking } from "./bookingQuote";
import type {
  BookingResponse,
  CinemaResponse,
  CreateCinemaInput,
} from "./cinema.interface"; // merge with existing import

const toCinemaResponse = (cinema: {
  id: number;
  name: string;
  bundleSizes: number[];
}): CinemaResponse => ({
  id: cinema.id,
  name: cinema.name,
  bundleSizes: cinema.bundleSizes,
});

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

export const createCinemas = async (
  inputs: CreateCinemaInput[],
): Promise<CinemaResponse[]> => {
  const existing = await prisma.cinema.findFirst({
    where: { name: { in: inputs.map((input) => input.name) } },
    select: { name: true },
  });
  if (existing) {
    throw new AppError(
      409,
      "DUPLICATE_NAME",
      `Cinema "${existing.name}" already exists`,
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const created: CinemaResponse[] = [];
      for (const input of inputs) {
        const cinema = await tx.cinema.create({
          data: { name: input.name, bundleSizes: input.bundleSizes },
        });
        created.push(toCinemaResponse(cinema));
      }
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(
        409,
        "DUPLICATE_NAME",
        "A cinema with this name already exists",
      );
    }
    throw error;
  }
};

export const getCinemas = async (): Promise<CinemaResponse[]> => {
  const cinemas = await prisma.cinema.findMany({ orderBy: { id: "asc" } });
  return cinemas.map(toCinemaResponse);
};

export const getCinemaById = async (id: number): Promise<CinemaResponse> => {
  const cinema = await prisma.cinema.findUnique({ where: { id } });
  if (!cinema) {
    throw new AppError(404, "NOT_FOUND", "Cinema not found");
  }
  return toCinemaResponse(cinema);
};

export const deleteCinema = async (id: number): Promise<void> => {
  const existing = await prisma.cinema.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Cinema not found");
  }
  await prisma.cinema.delete({ where: { id } });
};

export const getBookingQuote = async (
  cinemaId: number,
  groupSize: number,
): Promise<BookingResponse> => {
  const cinema = await prisma.cinema.findUnique({
    where: { id: cinemaId },
    select: { bundleSizes: true },
  });
  if (!cinema) {
    throw new AppError(404, "NOT_FOUND", "Cinema not found");
  }

  const breakdown = calculateBooking(cinema.bundleSizes, groupSize);
  if (!breakdown) {
    return { possible: false, groupSize };
  }

  return {
    possible: true,
    groupSize,
    totalBundles: breakdown.reduce((sum, item) => sum + item.count, 0),
    breakdown,
  };
};

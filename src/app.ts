import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFound";

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Doom Prep " });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

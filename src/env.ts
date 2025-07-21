// src/env.ts
import * as dotenv from "dotenv";
dotenv.config();

const env = {
  PORT: process.env.PORT,
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "*",
};

export default env;

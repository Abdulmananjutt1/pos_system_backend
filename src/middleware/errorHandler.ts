import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

// Global error handler — must have 4 params for Express to recognise it
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    console.error(`[AppError] ${err.statusCode} ${err.message}`);
  } else {
    console.error(`[UnhandledError] ${err.name}: ${err.message}`);
    console.error(err.stack);
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message    = err instanceof AppError ? err.message : "Internal server error";

  const body: ApiResponse = { success: false, message };
  res.status(statusCode).json(body);
}

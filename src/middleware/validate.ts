import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { ApiResponse } from "../types";

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const body: ApiResponse = {
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => e.msg as string),
    };
    res.status(422).json(body);
    return;
  }
  next();
}

import { Request, Response } from "express";
import { SettingsModel } from "../models/settingsModel";
import { ApiResponse } from "../types";

export const settingsController = {
  async get(_req: Request, res: Response): Promise<void> {
    const settings = await SettingsModel.get();
    res.json({ success: true, data: settings } satisfies ApiResponse);
  },

  async update(req: Request, res: Response): Promise<void> {
    const settings = await SettingsModel.update(req.body);
    res.json({ success: true, message: "Settings updated", data: settings } satisfies ApiResponse);
  },
};

import { Request, Response } from "express";
import { NotificationModel } from "../models/notificationModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse, PaginationQuery } from "../types";

export const notificationController = {
  async getAll(req: Request, res: Response): Promise<void> {
    const query: PaginationQuery & { unreadOnly?: boolean } = {
      page:       Number(req.query.page)  || 1,
      limit:      Number(req.query.limit) || 10,
      unreadOnly: req.query.unread === "true",
    };
    const result = await NotificationModel.findAll({ ...query, userId: req.user!.id });
    res.json({ success: true, data: result } satisfies ApiResponse);
  },

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    const count = await NotificationModel.getUnreadCount(req.user!.id);
    res.json({ success: true, data: { count } } satisfies ApiResponse);
  },

  async markRead(req: Request, res: Response): Promise<void> {
    const notification = await NotificationModel.findById(req.params.id);
    if (!notification) throw new AppError("Notification not found", 404);
    const updated = await NotificationModel.markRead(req.params.id);
    res.json({ success: true, data: updated } satisfies ApiResponse);
  },

  async markAllRead(req: Request, res: Response): Promise<void> {
    await NotificationModel.markAllRead(req.user!.id);
    res.json({ success: true, message: "All notifications marked as read" } satisfies ApiResponse);
  },

  async generateAlerts(_req: Request, res: Response): Promise<void> {
    await NotificationModel.generateSystemAlerts();
    res.json({ success: true, message: "System alerts generated" } satisfies ApiResponse);
  },
};

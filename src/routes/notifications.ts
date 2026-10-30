import { Router } from "express";
import { notificationController } from "../controllers/notificationController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/",              notificationController.getAll);
router.get("/unread-count",  notificationController.getUnreadCount);
router.patch("/:id/read",    notificationController.markRead);
router.post("/mark-all-read", notificationController.markAllRead);
router.post("/generate-alerts", authorize("admin"), notificationController.generateAlerts);

export default router;

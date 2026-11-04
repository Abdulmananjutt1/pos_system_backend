import { Router } from "express";
import { reportController } from "../controllers/reportController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/summary", authorize("admin"), reportController.getSummary);

export default router;

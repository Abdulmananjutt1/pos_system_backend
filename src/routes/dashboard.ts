import { Router } from "express";
import { dashboardController } from "../controllers/dashboardController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", authorize("admin"), dashboardController.getData);

export default router;

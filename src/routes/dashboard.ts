import { Router } from "express";
import { dashboardController } from "../controllers/dashboardController";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", dashboardController.get);

export default router;

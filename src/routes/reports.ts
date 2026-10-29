import { Router } from "express";
import { reportController } from "../controllers/reportController";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/summary", reportController.getSummary);

export default router;

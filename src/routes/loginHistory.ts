import { Router } from "express";
import { loginHistoryController } from "../controllers/loginHistoryController";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/",      loginHistoryController.getAll);
router.get("/stats", loginHistoryController.getStats);

export default router;

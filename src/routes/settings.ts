import { Router } from "express";
import { settingsController } from "../controllers/settingsController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/",  settingsController.get);
router.put("/",  authorize("admin"), settingsController.update);

export default router;

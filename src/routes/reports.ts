import { Router } from "express";
import { reportController } from "../controllers/reportController";
<<<<<<< HEAD
import { authenticate } from "../middleware/auth";
=======
import { authenticate, authorize } from "../middleware/auth";
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

const router = Router();
router.use(authenticate);

<<<<<<< HEAD
router.get("/summary", reportController.getSummary);
=======
router.get("/summary", authorize("admin"), reportController.getSummary);
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

export default router;

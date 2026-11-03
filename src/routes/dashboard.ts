import { Router } from "express";
import { dashboardController } from "../controllers/dashboardController";
<<<<<<< HEAD
import { authenticate } from "../middleware/auth";
=======
import { authenticate, authorize } from "../middleware/auth";
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

const router = Router();
router.use(authenticate);

<<<<<<< HEAD
router.get("/", dashboardController.get);
=======
router.get("/", authorize("admin"), dashboardController.getData);
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

export default router;

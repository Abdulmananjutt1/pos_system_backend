import { Router } from "express";
import { returnController } from "../controllers/returnController";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/",      returnController.getAll);
router.get("/stats", returnController.getStats);
router.get("/:id",   returnController.getOne);
router.post("/",     returnController.create);

export default router;

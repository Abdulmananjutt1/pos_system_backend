import { Router } from "express";
import { stockCountController } from "../controllers/stockCountController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/",                    stockCountController.getAll);
router.get("/:id",                 stockCountController.getOne);
router.post("/",                   authorize("admin"), stockCountController.create);
router.patch("/:id/items",         stockCountController.updateItem);
router.patch("/:id/finalize",      authorize("admin"), stockCountController.finalize);
router.delete("/:id",              authorize("admin"), stockCountController.remove);

export default router;

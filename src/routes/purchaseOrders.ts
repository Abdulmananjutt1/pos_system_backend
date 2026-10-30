import { Router } from "express";
import { purchaseOrderController } from "../controllers/purchaseOrderController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/",               purchaseOrderController.getAll);
router.get("/:id",            purchaseOrderController.getOne);
router.post("/",              authorize("admin"), purchaseOrderController.create);
router.put("/:id",            authorize("admin"), purchaseOrderController.update);
router.patch("/:id/receive",  authorize("admin"), purchaseOrderController.receive);
router.delete("/:id",         authorize("admin"), purchaseOrderController.remove);

export default router;

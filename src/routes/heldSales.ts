import { Router } from "express";
import { heldSaleController } from "../controllers/heldSaleController";
import { authenticate, requirePermission } from "../middleware/auth";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
router.use(authenticate);

router.get(  "/", requirePermission(PERMISSIONS.SALES_CREATE), heldSaleController.getAll);
router.post( "/", requirePermission(PERMISSIONS.SALES_CREATE), heldSaleController.create);
router.delete("/:id", requirePermission(PERMISSIONS.SALES_CREATE), heldSaleController.remove);

export default router;

import { Router } from "express";
import { body } from "express-validator";
import { purchaseOrderController } from "../controllers/purchaseOrderController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

router.get("/",                        purchaseOrderController.getAll);
router.get("/:id",                     purchaseOrderController.getOne);

router.post(
  "/",
  authorize("admin"),
  [
    body("supplierName").notEmpty().withMessage("Supplier name is required"),
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
  ],
  validate,
  purchaseOrderController.create
);

router.patch(
  "/:id/status",
  [body("status").notEmpty().withMessage("Status is required")],
  validate,
  purchaseOrderController.updateStatus
);

router.post(
  "/:id/receive",
  authorize("admin"),
  [body("items").isArray({ min: 1 }).withMessage("Items are required")],
  validate,
  purchaseOrderController.receiveGoods
);

router.delete("/:id", authorize("admin"), purchaseOrderController.remove);

export default router;

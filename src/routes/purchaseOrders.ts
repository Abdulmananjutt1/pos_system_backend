import { Router } from "express";
<<<<<<< HEAD
import { purchaseOrderController } from "../controllers/purchaseOrderController";
import { authenticate, authorize } from "../middleware/auth";
=======
import { body } from "express-validator";
import { purchaseOrderController } from "../controllers/purchaseOrderController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

const router = Router();
router.use(authenticate);

<<<<<<< HEAD
router.get("/",               purchaseOrderController.getAll);
router.get("/:id",            purchaseOrderController.getOne);
router.post("/",              authorize("admin"), purchaseOrderController.create);
router.put("/:id",            authorize("admin"), purchaseOrderController.update);
router.patch("/:id/receive",  authorize("admin"), purchaseOrderController.receive);
router.delete("/:id",         authorize("admin"), purchaseOrderController.remove);
=======
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
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

export default router;

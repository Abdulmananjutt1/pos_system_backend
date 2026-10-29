import { Router } from "express";
import { body } from "express-validator";
import { saleController } from "../controllers/saleController";
import { authenticate, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
router.use(authenticate);

router.get("/",            requirePermission(PERMISSIONS.SALES_VIEW),   saleController.getAll);
router.get("/today-stats", requirePermission(PERMISSIONS.SALES_VIEW),   saleController.todayStats);
router.get("/:id",         requirePermission(PERMISSIONS.SALES_VIEW),   saleController.getOne);
router.post("/",           requirePermission(PERMISSIONS.SALES_CREATE),
  [
    body("items").isArray({ min: 1 }).withMessage("At least one item required"),
    body("paymentMethod").notEmpty().withMessage("Payment method required"),
    body("total").isFloat({ min: 0 }).withMessage("Valid total required"),
  ],
  validate,
  saleController.create
);
router.patch("/:id/refund", requirePermission(PERMISSIONS.SALES_REFUND), saleController.refund);

export default router;

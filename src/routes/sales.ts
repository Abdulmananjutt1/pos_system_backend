import { Router } from "express";
import { body } from "express-validator";
import { saleController } from "../controllers/saleController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

router.get("/",           saleController.getAll);
router.get("/today-stats",saleController.todayStats);
router.get("/:id",        saleController.getOne);

router.post(
  "/",
  [
    body("items").isArray({ min: 1 }).withMessage("At least one item required"),
    body("paymentMethod").notEmpty().withMessage("Payment method required"),
    body("total").isFloat({ min: 0 }).withMessage("Valid total required"),
  ],
  validate,
  saleController.create
);

router.patch("/:id/refund", authorize("admin"), saleController.refund);

export default router;

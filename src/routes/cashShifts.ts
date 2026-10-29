import { Router } from "express";
import { body } from "express-validator";
import { cashShiftController } from "../controllers/cashShiftController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

router.get("/",          cashShiftController.getAll);
router.get("/current",   cashShiftController.getCurrent);

router.post(
  "/open",
  [body("openingBalance").isFloat({ min: 0 }).withMessage("Valid opening balance required")],
  validate,
  cashShiftController.open
);

router.patch(
  "/:id/close",
  [body("closingBalance").isFloat({ min: 0 }).withMessage("Valid closing balance required")],
  validate,
  cashShiftController.close
);

router.post(
  "/:id/entries",
  [
    body("description").notEmpty().withMessage("Description is required"),
    body("amount").isFloat({ min: 0.01 }).withMessage("Valid amount required"),
    body("type").isIn(["in", "out"]).withMessage("Type must be in or out"),
  ],
  validate,
  cashShiftController.addEntry
);

export default router;

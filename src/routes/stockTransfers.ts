import { Router } from "express";
import { body } from "express-validator";
import { stockTransferController } from "../controllers/stockTransferController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

router.get("/",           stockTransferController.getAll);
router.get("/:id",        stockTransferController.getOne);

router.post(
  "/",
  [
    body("fromBranch").notEmpty().withMessage("From branch is required"),
    body("toBranch").notEmpty().withMessage("To branch is required"),
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
  ],
  validate,
  stockTransferController.create
);

router.patch(
  "/:id/status",
  [body("status").notEmpty().withMessage("Status is required")],
  validate,
  stockTransferController.updateStatus
);

router.post("/:id/receive", stockTransferController.receive);

export default router;

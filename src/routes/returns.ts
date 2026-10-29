import { Router } from "express";
import { body } from "express-validator";
import { saleReturnController } from "../controllers/saleReturnController";
import { authenticate, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
router.use(authenticate);

router.get("/",      requirePermission(PERMISSIONS.RETURNS_READ),   saleReturnController.getAll);
router.get("/stats", requirePermission(PERMISSIONS.RETURNS_READ),   saleReturnController.stats);
router.get("/:id",   requirePermission(PERMISSIONS.RETURNS_READ),   saleReturnController.getOne);
router.post("/",     requirePermission(PERMISSIONS.RETURNS_CREATE),
  [
    body("saleId").notEmpty().withMessage("Sale ID is required"),
    body("items").isArray({ min: 1 }).withMessage("Items are required"),
  ],
  validate,
  saleReturnController.create
);

export default router;

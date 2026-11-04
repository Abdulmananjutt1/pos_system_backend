import { Router } from "express";
<<<<<<< HEAD
import { returnController } from "../controllers/returnController";
import { authenticate } from "../middleware/auth";
=======
import { body } from "express-validator";
import { saleReturnController } from "../controllers/saleReturnController";
import { authenticate, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { PERMISSIONS } from "../config/permissions";
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

const router = Router();
router.use(authenticate);

<<<<<<< HEAD
router.get("/",      returnController.getAll);
router.get("/stats", returnController.getStats);
router.get("/:id",   returnController.getOne);
router.post("/",     returnController.create);
=======
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
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

export default router;

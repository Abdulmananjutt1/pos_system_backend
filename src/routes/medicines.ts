import { Router } from "express";
import { body } from "express-validator";
import { medicineController } from "../controllers/medicineController";
import { authenticate, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
router.use(authenticate);

router.get("/",            requirePermission(PERMISSIONS.MEDICINES_READ), medicineController.getAll);
router.get("/low-stock",   requirePermission(PERMISSIONS.MEDICINES_READ), medicineController.getLowStock);
router.get("/expiring",    requirePermission(PERMISSIONS.MEDICINES_READ), medicineController.getExpiring);
router.get("/:id",         requirePermission(PERMISSIONS.MEDICINES_READ), medicineController.getOne);

const medicineBody = [
  body("name").notEmpty().withMessage("Medicine name is required"),
  body("sellingPrice").isFloat({ min: 0 }).withMessage("Selling price must be a valid number"),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be a valid number"),
  body("expiryDate").isISO8601().withMessage("Expiry date must be a valid date"),
];

router.post(  "/",          requirePermission(PERMISSIONS.MEDICINES_WRITE), medicineBody, validate, medicineController.create);
router.put(   "/:id",       requirePermission(PERMISSIONS.MEDICINES_WRITE), medicineBody, validate, medicineController.update);
router.patch( "/:id/stock", requirePermission(PERMISSIONS.INVENTORY_ADJUST), [body("adjustment").isInt().withMessage("Integer adjustment required")], validate, medicineController.adjustStock);
router.delete("/:id",       requirePermission(PERMISSIONS.MEDICINES_WRITE), medicineController.remove);

export default router;

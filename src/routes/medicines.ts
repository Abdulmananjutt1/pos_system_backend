import { Router } from "express";
import { body } from "express-validator";
import { medicineController } from "../controllers/medicineController";
<<<<<<< HEAD
import { authenticate, authorize } from "../middleware/auth";
import { requirePermission } from "../middleware/checkPermission";
=======
import { authenticate, requirePermission } from "../middleware/auth";
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
import { validate } from "../middleware/validate";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
router.use(authenticate);

<<<<<<< HEAD
router.get("/",            requirePermission('view_medicines'), medicineController.getAll);
router.get("/low-stock",   requirePermission('view_medicines'), medicineController.getLowStock);
router.get("/expiring",    requirePermission('view_medicines'), medicineController.getExpiring);
router.get("/:id",         requirePermission('view_medicines'), medicineController.getOne);
=======
router.get("/",            requirePermission(PERMISSIONS.MEDICINES_READ), medicineController.getAll);
router.get("/low-stock",   requirePermission(PERMISSIONS.MEDICINES_READ), medicineController.getLowStock);
router.get("/expiring",    requirePermission(PERMISSIONS.MEDICINES_READ), medicineController.getExpiring);
router.get("/:id",         requirePermission(PERMISSIONS.MEDICINES_READ), medicineController.getOne);
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

const medicineBody = [
  body("name").notEmpty().withMessage("Medicine name is required"),
  body("sellingPrice").isFloat({ min: 0 }).withMessage("Selling price must be a valid number"),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be a valid number"),
  body("expiryDate").isISO8601().withMessage("Expiry date must be a valid date"),
];

<<<<<<< HEAD
router.post(   "/",                requirePermission('create_medicine'), medicineBody, validate, medicineController.create);
router.put(    "/:id",             requirePermission('edit_medicine'), medicineBody, validate, medicineController.update);
router.patch(  "/:id/stock",       requirePermission('edit_medicine'), [body("adjustment").isInt().withMessage("Integer adjustment required")], validate, medicineController.adjustStock);
router.delete( "/:id",             requirePermission('delete_medicine'), medicineController.remove);
=======
router.post(  "/",          requirePermission(PERMISSIONS.MEDICINES_WRITE), medicineBody, validate, medicineController.create);
router.put(   "/:id",       requirePermission(PERMISSIONS.MEDICINES_WRITE), medicineBody, validate, medicineController.update);
router.patch( "/:id/stock", requirePermission(PERMISSIONS.INVENTORY_ADJUST), [body("adjustment").isInt().withMessage("Integer adjustment required")], validate, medicineController.adjustStock);
router.delete("/:id",       requirePermission(PERMISSIONS.MEDICINES_WRITE), medicineController.remove);
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

export default router;

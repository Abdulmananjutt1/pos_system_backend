import { Router } from "express";
import { body } from "express-validator";
import { medicineController } from "../controllers/medicineController";
import { authenticate, authorize } from "../middleware/auth";
import { requirePermission } from "../middleware/checkPermission";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

router.get("/",            requirePermission('view_medicines'), medicineController.getAll);
router.get("/low-stock",   requirePermission('view_medicines'), medicineController.getLowStock);
router.get("/expiring",    requirePermission('view_medicines'), medicineController.getExpiring);
router.get("/:id",         requirePermission('view_medicines'), medicineController.getOne);

const medicineBody = [
  body("name").notEmpty().withMessage("Name required"),
  body("selling_price").isFloat({ min: 0 }).withMessage("Valid selling price required"),
  body("stock").isInt({ min: 0 }).withMessage("Valid stock required"),
  body("expiry_date").isISO8601().withMessage("Valid expiry date required"),
];

router.post(   "/",                requirePermission('create_medicine'), medicineBody, validate, medicineController.create);
router.put(    "/:id",             requirePermission('edit_medicine'), medicineBody, validate, medicineController.update);
router.patch(  "/:id/stock",       requirePermission('edit_medicine'), [body("adjustment").isInt().withMessage("Integer adjustment required")], validate, medicineController.adjustStock);
router.delete( "/:id",             requirePermission('delete_medicine'), medicineController.remove);

export default router;

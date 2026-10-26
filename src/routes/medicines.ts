import { Router } from "express";
import { body } from "express-validator";
import { medicineController } from "../controllers/medicineController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

router.get("/",            medicineController.getAll);
router.get("/low-stock",   medicineController.getLowStock);
router.get("/expiring",    medicineController.getExpiring);
router.get("/:id",         medicineController.getOne);

const medicineBody = [
  body("name").notEmpty().withMessage("Name required"),
  body("selling_price").isFloat({ min: 0 }).withMessage("Valid selling price required"),
  body("stock").isInt({ min: 0 }).withMessage("Valid stock required"),
  body("expiry_date").isISO8601().withMessage("Valid expiry date required"),
];

router.post(   "/",                authorize("admin"), medicineBody, validate, medicineController.create);
router.put(    "/:id",             authorize("admin"), medicineBody, validate, medicineController.update);
router.patch(  "/:id/stock",       [body("adjustment").isInt().withMessage("Integer adjustment required")], validate, medicineController.adjustStock);
router.delete( "/:id",             authorize("admin"), medicineController.remove);

export default router;

import { Router } from "express";
import { body } from "express-validator";
import { customerController } from "../controllers/customerController";
import { authenticate, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
router.use(authenticate);

router.get("/",    requirePermission(PERMISSIONS.CUSTOMERS_READ),  customerController.getAll);
router.get("/:id", requirePermission(PERMISSIONS.CUSTOMERS_READ),  customerController.getOne);

const customerBody = [
  body("name").notEmpty().withMessage("Name required"),
  body("phone").notEmpty().withMessage("Phone required"),
];

// Cashier can create (POS quick-add), write permission for update/delete
router.post(  "/",    requirePermission(PERMISSIONS.CUSTOMERS_READ),  customerBody, validate, customerController.create);
router.put(   "/:id", requirePermission(PERMISSIONS.CUSTOMERS_WRITE), customerBody, validate, customerController.update);
router.delete("/:id", requirePermission(PERMISSIONS.CUSTOMERS_WRITE), customerController.remove);

export default router;

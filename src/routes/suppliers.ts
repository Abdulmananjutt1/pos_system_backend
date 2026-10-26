import { Router } from "express";
import { body } from "express-validator";
import { supplierController } from "../controllers/supplierController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

router.get("/"     , supplierController.getAll);
router.get("/:id"  , supplierController.getOne);

const supplierBody = [
  body("name").notEmpty().withMessage("Name required"),
  body("phone").notEmpty().withMessage("Phone required"),
  body("address").notEmpty().withMessage("Address required"),
  body("contact_person").notEmpty().withMessage("Contact person required"),
];

router.post(  "/",    authorize("admin"), supplierBody, validate, supplierController.create);
router.put(   "/:id", authorize("admin"), supplierBody, validate, supplierController.update);
router.delete("/:id", authorize("admin"), supplierController.remove);

export default router;

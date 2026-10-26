import { Router } from "express";
import { body } from "express-validator";
import { customerController } from "../controllers/customerController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

router.get("/"     , customerController.getAll);
router.get("/:id"  , customerController.getOne);

const customerBody = [
  body("name").notEmpty().withMessage("Name required"),
  body("phone").notEmpty().withMessage("Phone required"),
];

router.post(  "/",    customerBody, validate, customerController.create);
router.put(   "/:id", customerBody, validate, customerController.update);
router.delete("/:id", customerController.remove);

export default router;

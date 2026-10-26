import { Router } from "express";
import { body } from "express-validator";
import { expenseController } from "../controllers/expenseController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

router.get("/",         expenseController.getAll);
router.get("/summary",  expenseController.summary);
router.delete("/:id",   authorize("admin"), expenseController.remove);

router.post(
  "/",
  [
    body("description").notEmpty().withMessage("Description required"),
    body("amount").isFloat({ min: 0.01 }).withMessage("Valid amount required"),
    body("category").notEmpty().withMessage("Category required"),
    body("date").isISO8601().withMessage("Valid date required"),
  ],
  validate,
  expenseController.create
);

export default router;

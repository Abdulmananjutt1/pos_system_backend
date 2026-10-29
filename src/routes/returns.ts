import { Router } from "express";
import { body } from "express-validator";
import { saleReturnController } from "../controllers/saleReturnController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

router.get("/",        saleReturnController.getAll);
router.get("/stats",   saleReturnController.stats);
router.get("/:id",     saleReturnController.getOne);

router.post(
  "/",
  [
    body("saleId").notEmpty().withMessage("Sale ID is required"),
    body("items").isArray({ min: 1 }).withMessage("Items are required"),
  ],
  validate,
  saleReturnController.create
);

export default router;

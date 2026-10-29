import { Router } from "express";
import { body } from "express-validator";
import { authController } from "../controllers/authController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validate,
  authController.login
);

// GET /api/auth/me  (protected)
router.get("/me", authenticate, authController.me);

// POST /api/auth/refresh  (protected — issue new token)
router.post("/refresh", authenticate, authController.refresh);

// POST /api/auth/register  (admin only)
router.post(
  "/register",
  authenticate,
  authorize("admin"),
  [
    body("name").notEmpty().withMessage("Name required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password min 6 chars"),
    body("role").isIn(["admin", "cashier"]).withMessage("Role must be admin or cashier"),
  ],
  validate,
  authController.register
);

export default router;

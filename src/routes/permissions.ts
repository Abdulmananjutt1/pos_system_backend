import express from 'express';
import {
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions,
  updateUserPermissions,
  checkUserPermission,
  getAllUsersWithPermissions,
} from '../controllers/permissionController';
import { authenticate, authorize, requirePermission } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all available permissions (admin only)
router.get('/', authorize('admin'), getAllPermissions);

// Get permissions for a specific role (admin only)
router.get('/roles/:role', authorize('admin'), getRolePermissions);

// Update permissions for a role (admin only)
router.put('/roles/:role', authorize('admin'), updateRolePermissions);

// Get all users with their permissions (admin only)
router.get('/users', authorize('admin'), getAllUsersWithPermissions);

// Get permissions for a specific user (admin only)
router.get('/users/:userId', authorize('admin'), getUserPermissions);

// Update permissions for a specific user (admin only)
router.put('/users/:userId', authorize('admin'), updateUserPermissions);

// Check if a user has a specific permission
router.get('/users/:userId/check', checkUserPermission);

export default router;

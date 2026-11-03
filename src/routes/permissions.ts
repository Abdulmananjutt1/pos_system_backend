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
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/checkPermission';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all available permissions (admin only)
router.get('/', requirePermission('manage_permissions'), getAllPermissions);

// Get permissions for a specific role (admin only)
router.get('/roles/:role', requirePermission('manage_permissions'), getRolePermissions);

// Update permissions for a role (admin only)
router.put('/roles/:role', requirePermission('manage_permissions'), updateRolePermissions);

// Get all users with their permissions (admin only)
router.get('/users', requirePermission('manage_permissions'), getAllUsersWithPermissions);

// Get permissions for a specific user (admin only)
router.get('/users/:userId', requirePermission('manage_permissions'), getUserPermissions);

// Update permissions for a specific user (admin only)
router.put('/users/:userId', requirePermission('manage_permissions'), updateUserPermissions);

// Check if a user has a specific permission
router.get('/users/:userId/check', checkUserPermission);

export default router;

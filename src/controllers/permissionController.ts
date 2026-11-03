import { Request, Response } from 'express';
import prisma from '../config/db';
import { Role } from '@prisma/client';

// Get all permissions
export const getAllPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    // Group by module
    const grouped = permissions.reduce((acc: any, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {});

    res.json({ success: true, data: grouped, all: permissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get permissions for a specific role
export const getRolePermissions = async (req: Request, res: Response) => {
  try {
    const { role } = req.params;

    if (!['admin', 'cashier'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const permissions = await prisma.permission.findMany({
      include: {
        rolePermissions: {
          where: { role: role as Role },
        },
      },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    const formatted = permissions.map((perm) => ({
      id: perm.id,
      name: perm.name,
      description: perm.description,
      module: perm.module,
      action: perm.action,
      isGranted: perm.rolePermissions.length > 0 && perm.rolePermissions[0].isGranted,
    }));

    res.json({ success: true, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update role permissions (Super Admin only)
export const updateRolePermissions = async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body; // Array of { permissionId, isGranted }

    if (!['admin', 'cashier'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Prevent removing manage_permissions from admin
    if (role === 'admin') {
      const managePermission = await prisma.permission.findFirst({
        where: { name: 'manage_permissions' },
      });

      const removingManagePermission = permissions.some(
        (p: any) => p.permissionId === managePermission?.id && !p.isGranted
      );

      if (removingManagePermission) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove manage_permissions from admin role',
        });
      }
    }

    // Update permissions in transaction
    await prisma.$transaction(async (tx) => {
      for (const { permissionId, isGranted } of permissions) {
        await tx.rolePermission.upsert({
          where: {
            role_permissionId: {
              role: role as Role,
              permissionId,
            },
          },
          update: { isGranted },
          create: {
            role: role as Role,
            permissionId,
            isGranted,
          },
        });
      }
    });

    res.json({ success: true, message: 'Permissions updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user-specific permissions (override role permissions)
export const getUserPermissions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role },
      include: { permission: true },
    });

    // Merge with custom permissions (custom overrides role)
    const permissionMap = new Map();

    // Add role permissions first
    rolePermissions.forEach((rp) => {
      permissionMap.set(rp.permission.id, {
        ...rp.permission,
        isGranted: rp.isGranted,
        source: 'role',
      });
    });

    // Override with custom permissions
    user.customPermissions.forEach((up) => {
      permissionMap.set(up.permission.id, {
        ...up.permission,
        isGranted: up.isGranted,
        source: 'custom',
      });
    });

    const permissions = Array.from(permissionMap.values());

    res.json({ success: true, data: permissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user-specific permissions (Super Admin only)
export const updateUserPermissions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body; // Array of { permissionId, isGranted }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Don't allow modifying admin users' manage_permissions
    if (user.role === 'admin') {
      const managePermission = await prisma.permission.findFirst({
        where: { name: 'manage_permissions' },
      });

      const removingManagePermission = permissions.some(
        (p: any) => p.permissionId === managePermission?.id && !p.isGranted
      );

      if (removingManagePermission) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove manage_permissions from admin users',
        });
      }
    }

    // Update user permissions in transaction
    await prisma.$transaction(async (tx) => {
      for (const { permissionId, isGranted } of permissions) {
        await tx.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId,
              permissionId,
            },
          },
          update: { isGranted },
          create: {
            userId,
            permissionId,
            isGranted,
          },
        });
      }
    });

    res.json({ success: true, message: 'User permissions updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check if user has permission
export const checkUserPermission = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { permission } = req.query;

    if (!permission || typeof permission !== 'string') {
      return res.status(400).json({ success: false, message: 'Permission name required' });
    }

    const hasPermission = await checkPermission(userId, permission);

    res.json({ success: true, hasPermission });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to check permission
export const checkPermission = async (userId: string, permissionName: string): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user || !user.isActive) return false;

    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!permission) return false;

    // Check custom permission first
    const customPerm = user.customPermissions.find((up) => up.permissionId === permission.id);
    if (customPerm) {
      return customPerm.isGranted;
    }

    // Check role permission
    const rolePerm = await prisma.rolePermission.findUnique({
      where: {
        role_permissionId: {
          role: user.role,
          permissionId: permission.id,
        },
      },
    });

    return rolePerm?.isGranted ?? false;
  } catch (error) {
    return false;
  }
};

// Get all users with their permissions
export const getAllUsersWithPermissions = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        customPermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all permissions for reference
    const allPermissions = await prisma.permission.findMany();

    // Get role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      include: { permission: true },
    });

    const formatted = users.map((user) => {
      const userRolePerms = rolePermissions.filter((rp) => rp.role === user.role);
      
      const permissionStatus = allPermissions.map((perm) => {
        // Check custom permission first
        const customPerm = user.customPermissions.find((up) => up.permissionId === perm.id);
        if (customPerm) {
          return {
            permissionId: perm.id,
            name: perm.name,
            isGranted: customPerm.isGranted,
            source: 'custom',
          };
        }

        // Check role permission
        const rolePerm = userRolePerms.find((rp) => rp.permissionId === perm.id);
        return {
          permissionId: perm.id,
          name: perm.name,
          isGranted: rolePerm?.isGranted ?? false,
          source: 'role',
        };
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        permissions: permissionStatus,
      };
    });

    res.json({ success: true, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

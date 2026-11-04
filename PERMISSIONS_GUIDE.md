# Role-Based Permissions System

## Overview
Yeh system aapko granular control deta hai ke kon sa user kya kar sakta hai. Super Admin permissions manage kar sakta hai aur specific roles ya individual users ko access de sakta hai.

## Features

### 1. **Permission Levels**
- **Module-based**: Har feature (medicines, sales, etc.) ke liye alag permissions
- **Action-based**: View, Create, Edit, Delete permissions
- **Role-based**: Admin aur Cashier roles ke liye default permissions
- **User-based**: Individual users ko custom permissions

### 2. **Default Permissions**

#### Admin Role (by default)
- ✅ All permissions granted

#### Cashier Role (by default)
- ✅ `view_dashboard` - Dashboard dekh sakte hain
- ✅ `view_medicines` - Medicines list dekh sakte hain  
- ✅ `view_sales` - Sales history dekh sakte hain
- ✅ `create_sale` - Naye sale create kar sakte hain
- ✅ `view_customers` - Customers list dekh sakte hain
- ✅ `create_customer` - Naye customer add kar sakte hain
- ❌ Edit/Delete permissions nahi hain (unless granted by admin)

## API Endpoints

### 1. Get All Available Permissions
```http
GET /api/permissions
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dashboard": [
      {
        "id": "uuid",
        "name": "view_dashboard",
        "description": "View dashboard and analytics",
        "module": "dashboard",
        "action": "view"
      }
    ],
    "medicines": [...],
    "sales": [...]
  }
}
```

### 2. Get Role Permissions
```http
GET /api/permissions/roles/:role
Authorization: Bearer <admin_token>
```

Example: `GET /api/permissions/roles/cashier`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "view_medicines",
      "description": "View medicines list",
      "module": "medicines",
      "action": "view",
      "isGranted": true
    },
    {
      "id": "uuid",
      "name": "create_medicine",
      "description": "Add new medicine",
      "module": "medicines",
      "action": "create",
      "isGranted": false
    }
  ]
}
```

### 3. Update Role Permissions (Super Admin Only)
```http
PUT /api/permissions/roles/:role
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "permissions": [
    {
      "permissionId": "uuid-of-permission",
      "isGranted": true
    },
    {
      "permissionId": "uuid-of-another-permission",
      "isGranted": false
    }
  ]
}
```

**Example:** Cashier ko medicine create karne ka permission dena
```json
{
  "permissions": [
    {
      "permissionId": "create_medicine_uuid",
      "isGranted": true
    }
  ]
}
```

### 4. Get User Permissions
```http
GET /api/permissions/users/:userId
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "view_medicines",
      "isGranted": true,
      "source": "role"
    },
    {
      "id": "uuid",
      "name": "edit_medicine",
      "isGranted": true,
      "source": "custom"
    }
  ]
}
```

### 5. Update User Permissions (Override Role)
```http
PUT /api/permissions/users/:userId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "permissions": [
    {
      "permissionId": "uuid-of-permission",
      "isGranted": true
    }
  ]
}
```

### 6. Get All Users with Permissions
```http
GET /api/permissions/users
Authorization: Bearer <admin_token>
```

### 7. Check User Permission
```http
GET /api/permissions/users/:userId/check?permission=create_medicine
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "hasPermission": true
}
```

## How to Use in Routes

### Example: Adding Permission Check to Existing Route

**Before:**
```typescript
import { authenticate, authorize } from "../middleware/auth";

router.get("/medicines", authenticate, medicineController.getAll);
router.post("/medicines", authenticate, authorize("admin"), medicineController.create);
```

**After:**
```typescript
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/checkPermission";

router.get("/medicines", authenticate, requirePermission('view_medicines'), medicineController.getAll);
router.post("/medicines", authenticate, requirePermission('create_medicine'), medicineController.create);
```

### Multiple Permissions Check

```typescript
import { requireAnyPermission, requireAllPermissions } from "../middleware/checkPermission";

// User needs ANY of these permissions
router.get("/reports", 
  authenticate, 
  requireAnyPermission(['view_reports', 'export_reports']), 
  reportController.get
);

// User needs ALL of these permissions
router.post("/sensitive-action", 
  authenticate, 
  requireAllPermissions(['edit_settings', 'manage_permissions']), 
  controller.action
);
```

## Available Permissions

| Module | Permission Name | Description |
|--------|----------------|-------------|
| **Dashboard** |
| | `view_dashboard` | View dashboard and analytics |
| **Medicines** |
| | `view_medicines` | View medicines list |
| | `create_medicine` | Add new medicine |
| | `edit_medicine` | Edit medicine details |
| | `delete_medicine` | Delete medicine |
| **Sales** |
| | `view_sales` | View sales history |
| | `create_sale` | Create new sale |
| | `void_sale` | Void/cancel sale |
| **Customers** |
| | `view_customers` | View customers list |
| | `create_customer` | Add new customer |
| | `edit_customer` | Edit customer details |
| | `delete_customer` | Delete customer |
| **Suppliers** |
| | `view_suppliers` | View suppliers list |
| | `create_supplier` | Add new supplier |
| | `edit_supplier` | Edit supplier details |
| | `delete_supplier` | Delete supplier |
| **Purchase Orders** |
| | `view_purchase_orders` | View purchase orders |
| | `create_purchase_order` | Create purchase order |
| | `edit_purchase_order` | Edit purchase order |
| | `delete_purchase_order` | Delete purchase order |
| **Returns** |
| | `view_returns` | View returns |
| | `create_return` | Process return |
| **Stock Count** |
| | `view_stock_count` | View stock counts |
| | `create_stock_count` | Create stock count |
| | `edit_stock_count` | Edit stock count |
| **Transfers** |
| | `view_transfers` | View stock transfers |
| | `create_transfer` | Create stock transfer |
| | `edit_transfer` | Edit stock transfer |
| | `delete_transfer` | Delete stock transfer |
| **Expenses** |
| | `view_expenses` | View expenses |
| | `create_expense` | Add expense |
| | `edit_expense` | Edit expense |
| | `delete_expense` | Delete expense |
| **Reports** |
| | `view_reports` | View reports |
| | `export_reports` | Export reports |
| **Settings** |
| | `view_settings` | View settings |
| | `edit_settings` | Edit settings |
| **Users** |
| | `view_users` | View users list |
| | `create_user` | Create new user |
| | `edit_user` | Edit user details |
| | `delete_user` | Delete user |
| | `manage_permissions` | Manage role permissions |

## Permission Hierarchy

1. **User-specific permissions** (highest priority)
   - Individual user ko diye gaye permissions
   - Role permissions ko override karte hain

2. **Role-based permissions**
   - User ke role ke according default permissions
   - Agar user-specific permission nahi hai to yeh use hota hai

## Security Notes

1. ✅ **Admin Protection**: Admin role se `manage_permissions` kabhi remove nahi ho sakti
2. ✅ **Super Admin Bypass**: Optional - Admin role ko permission check bypass kar sakti hai (currently disabled for strict checking)
3. ✅ **Token Required**: Sare endpoints authentication require karte hain
4. ✅ **403 Forbidden**: Agar permission nahi hai to clear error message milta hai

## Usage Example Flow

### Scenario: Cashier ko medicine edit karne ka permission dena

1. **Admin login kare**
   ```bash
   POST /api/auth/login
   ```

2. **Check current cashier permissions**
   ```bash
   GET /api/permissions/roles/cashier
   ```

3. **Update cashier role permissions**
   ```bash
   PUT /api/permissions/roles/cashier
   {
     "permissions": [
       { "permissionId": "<edit_medicine_id>", "isGranted": true }
     ]
   }
   ```

4. **Verify changes**
   ```bash
   GET /api/permissions/roles/cashier
   ```

### Scenario: Specific user ko custom permission dena

```bash
PUT /api/permissions/users/<user_id>
{
  "permissions": [
    { "permissionId": "<delete_medicine_id>", "isGranted": true }
  ]
}
```

## Testing

Test karne ke liye:

```bash
# 1. Check if permission system is working
GET /api/permissions

# 2. Try accessing protected route without permission
GET /api/medicines (should work if user has view_medicines)

# 3. Try creating medicine without permission
POST /api/medicines (should return 403 if no create_medicine permission)
```

## Migration Applied

Database mein yeh tables add ho gaye hain:
- `permissions` - All available permissions
- `role_permissions` - Role-level permissions
- `user_permissions` - User-specific permission overrides

Default data bhi insert ho gaya hai with admin having all permissions and cashier having basic permissions.

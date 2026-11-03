// ─── API Response wrapper ─────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationQuery {
  page?:      number;
  limit?:     number;
  search?:    string;
  sortBy?:    string;
  sortOrder?: "asc" | "desc";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PaginatedResponse<T = any> {
  items:      T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "cashier";

export interface JwtPayload {
<<<<<<< HEAD
  id:    string;
  email: string;
  role:  UserRole;
=======
  id:          string;
  email:       string;
  role:        "admin" | "cashier";
  permissions: string[];
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
}

// ─── Sale creation input ──────────────────────────────────────────────────────
export interface CreateSaleItemInput {
  medicineId:   string;
  medicineName: string;
  quantity:     number;
  unitPrice:    number;
  discount?:    number;
  total:        number;
}

export interface CreateSaleInput {
  invoiceNumber: string;
  customerId?:   string;
  customerName?: string;
  subtotal:      number;
  discount?:     number;
  tax?:          number;
  total:         number;
  paymentMethod: string;
  cashierId:     string;
  cashierName:   string;
  items:         CreateSaleItemInput[];
}

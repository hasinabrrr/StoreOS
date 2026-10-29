export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface BaseEntity {
  localId: string; // UUID v4
  serverId?: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  businessId: string;
  name: string;
  address?: string;
  isActive: boolean;
}

export interface UserProfile {
  id: string;
  businessId: string;
  role: 'owner' | 'manager' | 'cashier';
  branchId: string;
  fullName: string;
  email: string;
}

export interface ProductCategory extends BaseEntity {
  businessId: string;
  name: string;
  parentId?: string | null;
}

export interface Product extends BaseEntity {
  businessId: string;
  sku: string;
  barcode?: string;
  name: string;
  categoryId?: string | null;
  brand?: string;
  unit: string; // pcs, kg, ltr, etc.
  purchasePriceMinor: number;
  sellPriceMinor: number;
  taxRate: number; // percentage
  hasVariants: boolean;
  hasBatchTracking: boolean;
  hasSerialTracking: boolean;
  isActive: boolean;
  currentStock: number;
  lowStockThreshold: number;
}

export interface ProductVariant extends BaseEntity {
  productId: string;
  sku: string;
  barcode?: string;
  attributeJson: Record<string, string>; // e.g. { "size": "M", "color": "Blue" }
  extraPriceMinor: number;
  currentStock: number;
}

export interface StockMovement extends BaseEntity {
  businessId: string;
  branchId: string;
  productId: string;
  variantId?: string | null;
  type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'transfer';
  qtyDelta: number; // + or -
  refType?: string; // invoice, purchase_order, etc.
  refId?: string;
  createdBy: string;
  clientGeneratedId: string;
}

export interface Customer extends BaseEntity {
  businessId: string;
  name: string;
  phone: string;
  address?: string;
  openingDueMinor: number;
  totalDueMinor: number;
}

export interface Supplier extends BaseEntity {
  businessId: string;
  name: string;
  phone: string;
  address?: string;
}

export interface SalesInvoiceItem {
  localId: string;
  invoiceLocalId: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  qty: number;
  unitPriceMinor: number;
  discountMinor: number;
  totalMinor: number;
}

export interface SalesInvoice extends BaseEntity {
  businessId: string;
  branchId: string;
  invoiceNo: string;
  customerLocalId?: string | null;
  customerName?: string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  paidMinor: number;
  dueMinor: number;
  status: 'paid' | 'partial' | 'due' | 'void';
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'card' | 'mixed';
  createdBy: string;
  clientGeneratedId: string;
  items: SalesInvoiceItem[];
}

export interface PaymentRecord extends BaseEntity {
  businessId: string;
  invoiceLocalId?: string | null;
  customerLocalId?: string | null;
  amountMinor: number;
  method: 'cash' | 'bkash' | 'nagad' | 'card';
  direction: 'in' | 'out';
  note?: string;
}

export interface ExpenseRecord extends BaseEntity {
  businessId: string;
  branchId: string;
  category: string;
  amountMinor: number;
  note?: string;
}

export interface SyncQueueItem {
  id?: number;
  entityType: 'product' | 'customer' | 'stockMovement' | 'salesInvoice' | 'payment' | 'expense' | 'supplier';
  entityLocalId: string;
  op: 'insert' | 'update' | 'delete';
  payload: string; // JSON string
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppMeta {
  key: string;
  value: any;
}


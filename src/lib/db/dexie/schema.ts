import Dexie, { type Table } from 'dexie';
import type {
  Product,
  ProductVariant,
  ProductCategory,
  StockMovement,
  Customer,
  Supplier,
  SalesInvoice,
  SalesInvoiceItem,
  PaymentRecord,
  ExpenseRecord,
  SyncQueueItem,
  AppMeta,
} from '../types';

export class StoreOSDatabase extends Dexie {
  products!: Table<Product, string>;
  variants!: Table<ProductVariant, string>;
  categories!: Table<ProductCategory, string>;
  stockMovements!: Table<StockMovement, string>;
  customers!: Table<Customer, string>;
  suppliers!: Table<Supplier, string>;
  salesInvoices!: Table<SalesInvoice, string>;
  salesItems!: Table<SalesInvoiceItem, string>;
  payments!: Table<PaymentRecord, string>;
  expenses!: Table<ExpenseRecord, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  meta!: Table<AppMeta, string>;

  constructor() {
    super('StoreOSDB');

    this.version(1).stores({
      products: 'localId, serverId, sku, barcode, categoryId, businessId, isActive, [businessId+isActive]',
      variants: 'localId, serverId, productId, sku',
      categories: 'localId, serverId, businessId',
      stockMovements: 'localId, serverId, productId, type, createdAt, syncStatus',
      customers: 'localId, serverId, phone, businessId',
      suppliers: 'localId, serverId, businessId',
      salesInvoices: 'localId, serverId, invoiceNo, customerLocalId, status, createdAt, syncStatus',
      salesItems: 'localId, invoiceLocalId, productId',
      payments: 'localId, serverId, invoiceLocalId, customerLocalId, createdAt, syncStatus',
      expenses: 'localId, serverId, businessId, createdAt, syncStatus',
      syncQueue: '++id, entityType, entityLocalId, op, status, attempts, createdAt',
      meta: 'key',
    });
  }
}

export const db = new StoreOSDatabase();


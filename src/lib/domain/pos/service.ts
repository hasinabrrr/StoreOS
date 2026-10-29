import { db } from '@/lib/db/dexie/schema';
import { v4 as uuidv4 } from 'uuid';
import { SyncQueueManager } from '@/lib/sync/queue';
import type { SalesInvoice, SalesInvoiceItem, StockMovement, PaymentRecord } from '@/lib/db/types';

export interface CartItem {
  productId: string;
  variantId?: string | null;
  productName: string;
  qty: number;
  unitPriceMinor: number;
  discountMinor: number;
  unit: string;
}

export interface CheckoutPayload {
  cart: CartItem[];
  customerId?: string | null;
  customerName?: string;
  discountMinor: number;
  taxMinor: number;
  paidMinor: number;
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'card' | 'mixed';
  cashierName?: string;
  branchId?: string;
  businessId?: string;
}

export class POSService {
  private static sequenceCounter = 0;

  /**
   * Generates a collision-resistant offline invoice number
   * Format: INV-[BRANCH_PREFIX]-[DEVICE_TIMESTAMP_SUFFIX]-[MONOTONIC_SEQ]-[ENTROPY]
   */
  static generateOfflineInvoiceNumber(branchPrefix: string = 'MB', deviceId: string = 'DEV1'): string {
    this.sequenceCounter = (this.sequenceCounter + 1) % 100000;
    const seqStr = this.sequenceCounter.toString().padStart(5, '0');
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `#INV-${branchPrefix}-${deviceId}-${dateStr}-${seqStr}-${entropy}`;
  }

  /**
   * Complete checkout atomically in local IndexedDB
   */
  static async checkout(payload: CheckoutPayload): Promise<SalesInvoice> {
    const now = new Date().toISOString();
    const invoiceLocalId = uuidv4();
    const businessId = payload.businessId || 'demo-business-001';
    const branchId = payload.branchId || 'demo-branch-001';
    const invoiceNo = this.generateOfflineInvoiceNumber('MB');

    let subtotalMinor = 0;
    const invoiceItems: SalesInvoiceItem[] = payload.cart.map((item) => {
      const itemSubtotal = item.qty * item.unitPriceMinor - item.discountMinor;
      subtotalMinor += itemSubtotal;
      return {
        localId: uuidv4(),
        invoiceLocalId,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        qty: item.qty,
        unitPriceMinor: item.unitPriceMinor,
        discountMinor: item.discountMinor,
        totalMinor: itemSubtotal,
      };
    });

    const totalMinor = Math.max(0, subtotalMinor - payload.discountMinor + payload.taxMinor);
    const paidMinor = Math.min(payload.paidMinor, totalMinor);
    const dueMinor = Math.max(0, totalMinor - paidMinor);

    let status: SalesInvoice['status'] = 'paid';
    if (dueMinor > 0 && paidMinor > 0) status = 'partial';
    else if (dueMinor > 0 && paidMinor === 0) status = 'due';

    const clientGeneratedId = uuidv4();

    const invoice: SalesInvoice = {
      localId: invoiceLocalId,
      businessId,
      branchId,
      invoiceNo,
      customerLocalId: payload.customerId || null,
      customerName: payload.customerName || 'Walk-in Customer',
      subtotalMinor,
      discountMinor: payload.discountMinor,
      taxMinor: payload.taxMinor,
      totalMinor,
      paidMinor,
      dueMinor,
      status,
      paymentMethod: payload.paymentMethod,
      createdBy: payload.cashierName || 'John Doe',
      clientGeneratedId,
      items: invoiceItems,
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // Execute atomic local transaction
    await db.transaction(
      'rw',
      [db.salesInvoices, db.salesItems, db.products, db.stockMovements, db.customers, db.payments, db.syncQueue],
      async () => {
        // 1. Add sales invoice & invoice items
        await db.salesInvoices.add(invoice);
        await db.salesItems.bulkAdd(invoiceItems);

        // 2. Add payment record if paid > 0
        if (paidMinor > 0) {
          const payment: PaymentRecord = {
            localId: uuidv4(),
            businessId,
            invoiceLocalId,
            customerLocalId: payload.customerId || null,
            amountMinor: paidMinor,
            method: payload.paymentMethod === 'mixed' ? 'cash' : payload.paymentMethod,
            direction: 'in',
            note: `Payment for ${invoiceNo}`,
            syncStatus: 'pending',
            createdAt: now,
            updatedAt: now,
          };
          await db.payments.add(payment);
          await SyncQueueManager.enqueue('payment', payment.localId, 'insert', payment);
        }

        // 3. Deduct stock for each cart item via additive stock movements
        for (const item of payload.cart) {
          const product = await db.products.get(item.productId);
          if (product) {
            const newStock = Number((product.currentStock - item.qty).toFixed(3));
            await db.products.update(item.productId, {
              currentStock: newStock,
              updatedAt: now,
            });

            const movement: StockMovement = {
              localId: uuidv4(),
              businessId,
              branchId,
              productId: item.productId,
              variantId: item.variantId,
              type: 'sale',
              qtyDelta: -item.qty,
              refType: 'sales_invoice',
              refId: invoiceLocalId,
              createdBy: payload.cashierName || 'John Doe',
              clientGeneratedId: uuidv4(),
              syncStatus: 'pending',
              createdAt: now,
              updatedAt: now,
            };
            await db.stockMovements.add(movement);
            await SyncQueueManager.enqueue('stockMovement', movement.localId, 'insert', movement);
          }
        }

        // 4. Update customer dues if customer selected and due remains
        if (payload.customerId && dueMinor > 0) {
          const customer = await db.customers.get(payload.customerId);
          if (customer) {
            await db.customers.update(payload.customerId, {
              totalDueMinor: customer.totalDueMinor + dueMinor,
              updatedAt: now,
            });
            await SyncQueueManager.enqueue('customer', payload.customerId, 'update', {
              ...customer,
              totalDueMinor: customer.totalDueMinor + dueMinor,
            });
          }
        }

        // 5. Enqueue invoice sync
        await SyncQueueManager.enqueue('salesInvoice', invoiceLocalId, 'insert', invoice);
      }
    );

    return invoice;
  }
}


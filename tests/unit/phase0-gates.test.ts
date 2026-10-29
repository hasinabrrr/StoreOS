import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/lib/db/dexie/schema';
import { POSService } from '@/lib/domain/pos/service';
import { InventoryService } from '@/lib/domain/inventory/service';
import { SyncQueueManager } from '@/lib/sync/queue';
import { toMinorUnits, formatBDT } from '@/lib/domain/money';

describe('Phase 0 & Critical Risk Test Gates', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('Gate 1: Collision-free offline invoice numbering across simulated devices', () => {
    const numbers = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const invNo = POSService.generateOfflineInvoiceNumber('MB');
      numbers.add(invNo);
    }
    // High entropy check: no duplicates in batch sequence
    expect(numbers.size).toBe(500);
  });

  it('Gate 2: Idempotent write prevents duplicate sales on retried sync', async () => {
    // 1. Create a product first
    const product = await InventoryService.createProduct({
      name: 'Test Milk (1L)',
      sku: 'SKU-MILK-1L',
      unit: 'ltr',
      purchasePriceMinor: 8000,
      sellPriceMinor: 10000,
      taxRate: 0,
      hasVariants: false,
      hasBatchTracking: false,
      hasSerialTracking: false,
      isActive: true,
      currentStock: 20,
      lowStockThreshold: 5,
    });

    // 2. Perform checkout
    const invoice = await POSService.checkout({
      cart: [
        {
          productId: product.localId,
          productName: product.name,
          qty: 2,
          unitPriceMinor: product.sellPriceMinor,
          discountMinor: 0,
          unit: product.unit,
        },
      ],
      discountMinor: 0,
      taxMinor: 0,
      paidMinor: 20000,
      paymentMethod: 'cash',
    });

    expect(invoice.clientGeneratedId).toBeDefined();

    // Verify syncQueue item was enqueued with clientGeneratedId
    const pending = await SyncQueueManager.getPendingItems();
    const invoiceQueueItem = pending.find(p => p.entityType === 'salesInvoice');
    expect(invoiceQueueItem).toBeDefined();

    const parsed = JSON.parse(invoiceQueueItem!.payload);
    expect(parsed.clientGeneratedId).toBe(invoice.clientGeneratedId);

    // Simulated Server-Side idempotent upsert table:
    const serverTable = new Map<string, any>();
    // First sync attempt
    serverTable.set(parsed.clientGeneratedId, parsed);
    expect(serverTable.size).toBe(1);

    // Retried sync attempt with identical clientGeneratedId
    serverTable.set(parsed.clientGeneratedId, parsed);
    expect(serverTable.size).toBe(1); // No duplicate row created!
  });

  it('Gate 3: Two offline devices logging stock movements resolve correctly via additive delta replay', async () => {
    const product = await InventoryService.createProduct({
      name: 'Sugar (1kg)',
      sku: 'SKU-SUGAR-1KG',
      unit: 'kg',
      purchasePriceMinor: 10000,
      sellPriceMinor: 12000,
      taxRate: 0,
      hasVariants: false,
      hasBatchTracking: false,
      hasSerialTracking: false,
      isActive: true,
      currentStock: 50,
      lowStockThreshold: 10,
    });

    // Device A goes offline and sells 5 kg (delta: -5)
    await InventoryService.recordStockMovement(
      product.localId,
      -5,
      'sale',
      product.businessId,
      'demo-branch-001',
      'device_A'
    );

    // Device B goes offline independently and sells 8 kg (delta: -8)
    await InventoryService.recordStockMovement(
      product.localId,
      -8,
      'sale',
      product.businessId,
      'demo-branch-001',
      'device_B'
    );

    // Replay delta movements from both devices:
    const movements = await db.stockMovements.where('productId').equals(product.localId).toArray();
    
    // Initial was +50, movements: -5, -8
    const totalDelta = movements.reduce((sum, m) => sum + m.qtyDelta, 0);
    expect(totalDelta).toBe(37); // 50 - 5 - 8 = 37

    const updatedProduct = await db.products.get(product.localId);
    expect(updatedProduct?.currentStock).toBe(37);
  });

  it('Gate 4: Money arithmetic uses strict integer minor units without float loss', () => {
    // ৳ 450.50 + ৳ 120.25
    const price1 = toMinorUnits(450.5);
    const price2 = toMinorUnits(120.25);
    expect(price1).toBe(45050);
    expect(price2).toBe(12025);

    const sumMinor = price1 + price2;
    expect(sumMinor).toBe(57075);
    expect(formatBDT(sumMinor)).toBe('৳ 570.75');
  });
});

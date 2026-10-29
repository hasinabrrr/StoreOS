import { db } from '@/lib/db/dexie/schema';
import { v4 as uuidv4 } from 'uuid';
import { SyncQueueManager } from '@/lib/sync/queue';
import type { Product, StockMovement, ProductCategory } from '@/lib/db/types';
import { productSchema, stockMovementSchema, type ProductFormValues } from '@/lib/validation/product';

export class InventoryService {
  /**
   * Create a new product offline-first, updating Dexie and enqueuing sync
   */
  static async createProduct(
    values: ProductFormValues,
    businessId: string = 'demo-business-001',
    branchId: string = 'demo-branch-001'
  ): Promise<Product> {
    const validated = productSchema.parse(values);
    const now = new Date().toISOString();
    const localId = uuidv4();

    const newProduct: Product = {
      localId,
      businessId,
      ...validated,
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // Atomic Dexie transaction: insert product and initial stock movement if currentStock > 0
    await db.transaction('rw', [db.products, db.stockMovements, db.syncQueue], async () => {
      await db.products.add(newProduct);

      if (validated.currentStock > 0) {
        const movement: StockMovement = {
          localId: uuidv4(),
          businessId,
          branchId,
          productId: localId,
          type: 'adjustment',
          qtyDelta: validated.currentStock,
          refType: 'initial_stock',
          createdBy: 'system',
          clientGeneratedId: uuidv4(),
          syncStatus: 'pending',
          createdAt: now,
          updatedAt: now,
        };
        await db.stockMovements.add(movement);
        await SyncQueueManager.enqueue('stockMovement', movement.localId, 'insert', movement);
      }

      await SyncQueueManager.enqueue('product', localId, 'insert', newProduct);
    });

    return newProduct;
  }

  /**
   * Update an existing product
   */
  static async updateProduct(
    localId: string,
    updates: Partial<ProductFormValues>
  ): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.products, db.syncQueue], async () => {
      await db.products.update(localId, {
        ...updates,
        syncStatus: 'pending',
        updatedAt: now,
      });

      const updated = await db.products.get(localId);
      if (updated) {
        await SyncQueueManager.enqueue('product', localId, 'update', updated);
      }
    });
  }

  /**
   * Delete / Deactivate a product
   */
  static async deactivateProduct(localId: string): Promise<void> {
    await this.updateProduct(localId, { isActive: false });
  }

  /**
   * Record a stock delta movement (Purchase, Sale, Adjustment, Return)
   */
  static async recordStockMovement(
    productId: string,
    qtyDelta: number,
    type: StockMovement['type'],
    businessId: string = 'demo-business-001',
    branchId: string = 'demo-branch-001',
    refType?: string,
    refId?: string
  ): Promise<StockMovement> {
    const now = new Date().toISOString();
    const movementId = uuidv4();

    const movement: StockMovement = {
      localId: movementId,
      businessId,
      branchId,
      productId,
      type,
      qtyDelta,
      refType,
      refId,
      createdBy: 'current-user',
      clientGeneratedId: uuidv4(),
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await db.transaction('rw', [db.products, db.stockMovements, db.syncQueue], async () => {
      const product = await db.products.get(productId);
      if (!product) throw new Error(`Product not found: ${productId}`);

      const newStock = Number((product.currentStock + qtyDelta).toFixed(3));
      await db.products.update(productId, {
        currentStock: newStock,
        updatedAt: now,
      });

      await db.stockMovements.add(movement);
      await SyncQueueManager.enqueue('stockMovement', movementId, 'insert', movement);
    });

    return movement;
  }

  /**
   * Search and filter products
   */
  static async searchProducts(query: string = '', categoryId?: string | null): Promise<Product[]> {
    let collection = db.products.toCollection();

    let items = await collection.toArray();

    if (categoryId && categoryId !== 'all') {
      items = items.filter((p) => p.categoryId === categoryId);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q))
      );
    }

    return items;
  }
}


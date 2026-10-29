import { z } from 'zod';

export const productCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  parentId: z.string().nullable().optional(),
});

export const productVariantSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  attributeJson: z.record(z.string(), z.string()).default({}),
  extraPriceMinor: z.number().int().default(0),
  currentStock: z.number().default(0),
});

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().min(1, 'SKU is required').max(100),
  barcode: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  brand: z.string().optional(),
  unit: z.string().min(1, 'Unit is required').default('pcs'),
  purchasePriceMinor: z.number().int().nonnegative('Purchase price cannot be negative'),
  sellPriceMinor: z.number().int().nonnegative('Selling price cannot be negative'),
  taxRate: z.number().min(0).max(100).default(0),
  hasVariants: z.boolean().default(false),
  hasBatchTracking: z.boolean().default(false),
  hasSerialTracking: z.boolean().default(false),
  isActive: z.boolean().default(true),
  currentStock: z.number().default(0),
  lowStockThreshold: z.number().default(5),
});

export const stockMovementSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().nullable().optional(),
  type: z.enum(['purchase', 'sale', 'return', 'adjustment', 'transfer']),
  qtyDelta: z.number().refine((val) => val !== 0, 'Quantity delta cannot be zero'),
  refType: z.string().optional(),
  refId: z.string().optional(),
  note: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type StockMovementFormValues = z.infer<typeof stockMovementSchema>;


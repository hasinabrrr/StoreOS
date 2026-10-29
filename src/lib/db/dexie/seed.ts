import { db } from './schema';
import { v4 as uuidv4 } from 'uuid';
import type { Product, Customer, SalesInvoice } from '../types';

export async function seedInitialDemoData() {
  const count = await db.products.count();
  if (count > 0) return; // already seeded

  const now = new Date().toISOString();
  const businessId = 'demo-business-001';
  const branchId = 'demo-branch-001';

  // Seed sample products
  const demoProducts: Product[] = [
    {
      localId: uuidv4(),
      businessId,
      sku: 'SKU-RICE-5K',
      barcode: '8901234567890',
      name: 'Rice (5kg)',
      unit: 'kg',
      purchasePriceMinor: 38000,
      sellPriceMinor: 45000, // 450.00
      taxRate: 0,
      hasVariants: false,
      hasBatchTracking: false,
      hasSerialTracking: false,
      isActive: true,
      currentStock: 2, // low stock!
      lowStockThreshold: 5,
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
    },
    {
      localId: uuidv4(),
      businessId,
      sku: 'SKU-OIL-1L',
      barcode: '8901234567891',
      name: 'Cooking Oil (1L)',
      unit: 'ltr',
      purchasePriceMinor: 15000,
      sellPriceMinor: 18000, // 180.00
      taxRate: 0,
      hasVariants: false,
      hasBatchTracking: false,
      hasSerialTracking: false,
      isActive: true,
      currentStock: 5,
      lowStockThreshold: 10,
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
    },
    {
      localId: uuidv4(),
      businessId,
      sku: 'SKU-TSHIRT-BLU-M',
      barcode: '8901234567892',
      name: 'T-shirt (M, Blue)',
      unit: 'pcs',
      purchasePriceMinor: 35000,
      sellPriceMinor: 65000, // 650.00
      taxRate: 5,
      hasVariants: true,
      hasBatchTracking: false,
      hasSerialTracking: false,
      isActive: true,
      currentStock: 3,
      lowStockThreshold: 5,
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
    },
    {
      localId: uuidv4(),
      businessId,
      sku: 'SKU-MOB-CHG',
      barcode: '8901234567893',
      name: 'Mobile Fast Charger 20W',
      unit: 'pcs',
      purchasePriceMinor: 45000,
      sellPriceMinor: 85000,
      taxRate: 7.5,
      hasVariants: false,
      hasBatchTracking: false,
      hasSerialTracking: true,
      isActive: true,
      currentStock: 1,
      lowStockThreshold: 3,
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
    },
    {
      localId: uuidv4(),
      businessId,
      sku: 'SKU-SHMP-200',
      barcode: '8901234567894',
      name: 'Shampoo (200ml)',
      unit: 'pcs',
      purchasePriceMinor: 24000,
      sellPriceMinor: 32000,
      taxRate: 0,
      hasVariants: false,
      hasBatchTracking: true,
      hasSerialTracking: false,
      isActive: true,
      currentStock: 8,
      lowStockThreshold: 10,
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
    },
    {
      localId: uuidv4(),
      businessId,
      sku: 'SKU-SUGAR-1K',
      barcode: '8901234567895',
      name: 'Sugar (1kg)',
      unit: 'kg',
      purchasePriceMinor: 10500,
      sellPriceMinor: 12000,
      taxRate: 0,
      hasVariants: false,
      hasBatchTracking: false,
      hasSerialTracking: false,
      isActive: true,
      currentStock: 15,
      lowStockThreshold: 5,
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const demoCustomers: Customer[] = [
    {
      localId: uuidv4(),
      businessId,
      name: 'Rahim Ahmed',
      phone: '+880 1712 345678',
      address: 'Dhanmondi, Dhaka',
      openingDueMinor: 0,
      totalDueMinor: 245000, // 2,450.00
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
    },
    {
      localId: uuidv4(),
      businessId,
      name: 'Fatema Akter',
      phone: '+880 1823 456789',
      address: 'Mirpur, Dhaka',
      openingDueMinor: 0,
      totalDueMinor: 0,
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
    },
    {
      localId: uuidv4(),
      businessId,
      name: 'Karim Hossain',
      phone: '+880 1911 223344',
      address: 'Gulshan, Dhaka',
      openingDueMinor: 0,
      totalDueMinor: 120000, // 1,200.00
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
    },
    {
      localId: uuidv4(),
      businessId,
      name: 'Hasan Mahmud',
      phone: '+880 1833 445566',
      address: 'Uttara, Dhaka',
      openingDueMinor: 0,
      totalDueMinor: 350000, // 3,500.00
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.products.bulkAdd(demoProducts);
  await db.customers.bulkAdd(demoCustomers);

  // Seed sample recent sales invoices
  const demoInvoices: SalesInvoice[] = [
    {
      localId: uuidv4(),
      businessId,
      branchId,
      invoiceNo: '#INV-1007',
      customerName: 'walk-in',
      subtotalMinor: 125000,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 125000,
      paidMinor: 125000,
      dueMinor: 0,
      status: 'paid',
      paymentMethod: 'cash',
      createdBy: 'John Doe',
      clientGeneratedId: uuidv4(),
      items: [],
      syncStatus: 'synced',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      updatedAt: now,
    },
    {
      localId: uuidv4(),
      businessId,
      branchId,
      invoiceNo: '#INV-1006',
      customerName: 'Rahim Ahmed',
      subtotalMinor: 345000,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 345000,
      paidMinor: 100000,
      dueMinor: 245000,
      status: 'partial',
      paymentMethod: 'bkash',
      createdBy: 'John Doe',
      clientGeneratedId: uuidv4(),
      items: [],
      syncStatus: 'synced',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      updatedAt: now,
    },
    {
      localId: uuidv4(),
      businessId,
      branchId,
      invoiceNo: '#INV-1005',
      customerName: 'Sumi Akter',
      subtotalMinor: 98000,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 98000,
      paidMinor: 98000,
      dueMinor: 0,
      status: 'paid',
      paymentMethod: 'cash',
      createdBy: 'John Doe',
      clientGeneratedId: uuidv4(),
      items: [],
      syncStatus: 'synced',
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      updatedAt: now,
    },
  ];

  await db.salesInvoices.bulkAdd(demoInvoices);

  // Setup initial business meta
  await db.meta.bulkPut([
    { key: 'businessId', value: businessId },
    { key: 'branchId', value: branchId },
    { key: 'branchName', value: 'Main Branch' },
    { key: 'branchAddress', value: 'Shop No. 12, Green Road' },
    { key: 'lastSync', value: now },
  ]);
}


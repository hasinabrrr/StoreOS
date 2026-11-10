import { db } from './schema';
import { v4 as uuidv4 } from 'uuid';
import { getBusinessId, getBranchId, getUserName } from '../../auth/context';
import type { Product, Customer, SalesInvoice } from '../types';

export async function seedInitialDemoData() {
  const businessId = getBusinessId();
  // Only auto-seed demo data if running in demo mode
  if (businessId !== 'demo-business-001') {
    return;
  }

  const branchId = getBranchId();
  const ownerName = getUserName();

  // Check if we already have data for this specific business
  const existingProducts = await db.products.filter((p) => p.businessId === businessId).count();
  if (existingProducts > 0) return; // already seeded for this business

  const now = new Date().toISOString();

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
      createdBy: ownerName,
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
      createdBy: ownerName,
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
      createdBy: ownerName,
      clientGeneratedId: uuidv4(),
      items: [],
      syncStatus: 'synced',
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      updatedAt: now,
    },
  ];

  await db.salesInvoices.bulkAdd(demoInvoices);

  // Seed sample suppliers
  const supplierCount = await db.suppliers.count();
  if (supplierCount === 0) {
    await db.suppliers.bulkAdd([
      {
        localId: uuidv4(),
        businessId,
        name: 'Rahman Traders Ltd.',
        phone: '+880 1711 002233',
        address: 'Khatungonj, Chittagong',
        syncStatus: 'synced',
        createdAt: now,
        updatedAt: now,
      },
      {
        localId: uuidv4(),
        businessId,
        name: 'Bengal Grain Distributors',
        phone: '+880 1822 445566',
        address: 'Kawran Bazar, Dhaka',
        syncStatus: 'synced',
        createdAt: now,
        updatedAt: now,
      },
      {
        localId: uuidv4(),
        businessId,
        name: 'Apex Fast Foods & Essentials',
        phone: '+880 1933 778899',
        address: 'Tejgaon I/A, Dhaka',
        syncStatus: 'synced',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  // Seed sample expenses
  const expenseCount = await db.expenses.count();
  if (expenseCount === 0) {
    await db.expenses.bulkAdd([
      {
        localId: uuidv4(),
        businessId,
        branchId,
        category: 'Shop Rent',
        amountMinor: 2500000, // 25,000.00
        note: 'Monthly shop space rent',
        syncStatus: 'synced',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        updatedAt: now,
      },
      {
        localId: uuidv4(),
        businessId,
        branchId,
        category: 'Electricity & Utilities',
        amountMinor: 320000, // 3,200.00
        note: 'DESCO electricity bill for April',
        syncStatus: 'synced',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        updatedAt: now,
      },
      {
        localId: uuidv4(),
        businessId,
        branchId,
        category: 'Packaging & Bags',
        amountMinor: 150000, // 1,500.00
        note: 'Biodegradable shopping carry bags',
        syncStatus: 'synced',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        updatedAt: now,
      },
    ]);
  }

  // Seed sample employees
  const employeeCount = await db.employees.count();
  if (employeeCount === 0) {
    await db.employees.bulkAdd([
      {
        localId: uuidv4(),
        businessId,
        branchId,
        name: ownerName,
        role: 'Manager',
        phone: '+880 1700 112233',
        salaryMinor: 3500000,
        status: 'active',
        syncStatus: 'synced',
        createdAt: now,
        updatedAt: now,
      },
      {
        localId: uuidv4(),
        businessId,
        branchId,
        name: 'Fahim Hasan',
        role: 'Cashier',
        phone: '+880 1800 223344',
        salaryMinor: 1800000,
        status: 'active',
        syncStatus: 'synced',
        createdAt: now,
        updatedAt: now,
      },
      {
        localId: uuidv4(),
        businessId,
        branchId,
        name: 'Tanvir Hossain',
        role: 'Stock Keeper',
        phone: '+880 1900 334455',
        salaryMinor: 1500000,
        status: 'active',
        syncStatus: 'synced',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  // Seed sample branches
  const branchCount = await db.branches.count();
  if (branchCount === 0) {
    await db.branches.bulkAdd([
      {
        localId: uuidv4(),
        businessId,
        name: 'Main Branch',
        address: 'Shop No. 12, Green Road, Dhanmondi, Dhaka',
        phone: '+880 1712 345678',
        isMain: true,
        isActive: true,
        syncStatus: 'synced',
        createdAt: now,
        updatedAt: now,
      },
      {
        localId: uuidv4(),
        businessId,
        name: 'Uttara Branch',
        address: 'Sector 3, Jasimuddin Avenue, Uttara, Dhaka',
        phone: '+880 1812 987654',
        isMain: false,
        isActive: true,
        syncStatus: 'synced',
        createdAt: now,
        updatedAt: now,
      },
      {
        localId: uuidv4(),
        businessId,
        name: 'Chittagong Outlet',
        address: 'GEC Circle, Nasirabad, Chittagong',
        phone: '+880 1912 456789',
        isMain: false,
        isActive: true,
        syncStatus: 'synced',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  // Setup initial business meta
  await db.meta.bulkPut([
    { key: 'businessId', value: businessId },
    { key: 'branchId', value: branchId },
    { key: 'branchName', value: 'Main Branch' },
    { key: 'branchAddress', value: 'Shop No. 12, Green Road' },
    { key: 'lastSync', value: now },
  ]);
}

/**
 * Explicitly load sample products for a user's store on demand
 */
export async function seedSampleProductsForStore(customBusinessId?: string) {
  const businessId = customBusinessId || getBusinessId();
  const now = new Date().toISOString();

  const sampleProducts: Product[] = [
    {
      localId: uuidv4(),
      businessId,
      sku: 'SKU-RICE-5K',
      barcode: '8901234567890',
      name: 'Rice Premium (5kg)',
      unit: 'kg',
      purchasePriceMinor: 38000,
      sellPriceMinor: 45000,
      taxRate: 0,
      hasVariants: false,
      hasBatchTracking: false,
      hasSerialTracking: false,
      isActive: true,
      currentStock: 25,
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
      name: 'Soybean Oil (1L)',
      unit: 'ltr',
      purchasePriceMinor: 15000,
      sellPriceMinor: 18000,
      taxRate: 0,
      hasVariants: false,
      hasBatchTracking: false,
      hasSerialTracking: false,
      isActive: true,
      currentStock: 40,
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
      currentStock: 30,
      lowStockThreshold: 5,
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
    },
    {
      localId: uuidv4(),
      businessId,
      sku: 'SKU-TEA-400',
      barcode: '8901234567896',
      name: 'Black Tea (400g)',
      unit: 'pcs',
      purchasePriceMinor: 18000,
      sellPriceMinor: 22000,
      taxRate: 0,
      hasVariants: false,
      hasBatchTracking: false,
      hasSerialTracking: false,
      isActive: true,
      currentStock: 15,
      lowStockThreshold: 4,
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.products.bulkAdd(sampleProducts);
}



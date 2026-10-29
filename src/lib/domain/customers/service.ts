import { db } from '@/lib/db/dexie/schema';
import { v4 as uuidv4 } from 'uuid';
import { SyncQueueManager } from '@/lib/sync/queue';
import type { Customer, PaymentRecord } from '@/lib/db/types';

export class CustomerService {
  static async createCustomer(
    name: string,
    phone: string,
    address?: string,
    openingDueMinor: number = 0,
    businessId: string = 'demo-business-001'
  ): Promise<Customer> {
    const now = new Date().toISOString();
    const localId = uuidv4();

    const customer: Customer = {
      localId,
      businessId,
      name,
      phone,
      address,
      openingDueMinor,
      totalDueMinor: openingDueMinor,
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await db.transaction('rw', [db.customers, db.syncQueue], async () => {
      await db.customers.add(customer);
      await SyncQueueManager.enqueue('customer', localId, 'insert', customer);
    });

    return customer;
  }

  static async collectDuePayment(
    customerLocalId: string,
    amountMinor: number,
    method: 'cash' | 'bkash' | 'nagad' | 'card' = 'cash',
    businessId: string = 'demo-business-001'
  ): Promise<PaymentRecord> {
    const now = new Date().toISOString();
    const paymentId = uuidv4();

    const payment: PaymentRecord = {
      localId: paymentId,
      businessId,
      customerLocalId,
      amountMinor,
      method,
      direction: 'in',
      note: 'Due collection payment',
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await db.transaction('rw', [db.customers, db.payments, db.syncQueue], async () => {
      const customer = await db.customers.get(customerLocalId);
      if (!customer) throw new Error('Customer not found');

      const updatedDue = Math.max(0, customer.totalDueMinor - amountMinor);
      await db.customers.update(customerLocalId, {
        totalDueMinor: updatedDue,
        updatedAt: now,
      });

      await db.payments.add(payment);
      await SyncQueueManager.enqueue('payment', paymentId, 'insert', payment);
      await SyncQueueManager.enqueue('customer', customerLocalId, 'update', {
        ...customer,
        totalDueMinor: updatedDue,
      });
    });

    return payment;
  }
}


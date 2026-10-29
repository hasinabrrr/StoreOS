-- ====================================================================
-- StoreOS Cloud Schema & Row Level Security (RLS) - Phase 1 Migration
-- All monetary fields stored in BIGINT (minor units: poisha/cents)
-- Multi-tenant isolation by business_id & branch_id
-- ====================================================================

-- 1. Businesses
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Branches
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Users Profile (maps to Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'manager', 'cashier')),
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  barcode VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand VARCHAR(100),
  unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
  purchase_price_minor BIGINT NOT NULL DEFAULT 0,
  sell_price_minor BIGINT NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  has_variants BOOLEAN NOT NULL DEFAULT FALSE,
  has_batch_tracking BOOLEAN NOT NULL DEFAULT FALSE,
  has_serial_tracking BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  barcode VARCHAR(100),
  attribute_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  extra_price_minor BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Stock Movements (additive delta log)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'sale', 'return', 'adjustment', 'transfer')),
  qty_delta NUMERIC(12, 3) NOT NULL,
  ref_type VARCHAR(50),
  ref_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_generated_id UUID UNIQUE NOT NULL -- Idempotency key for offline sync
);

-- 8. Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address TEXT,
  opening_due_minor BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Sales Invoices
CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  invoice_no VARCHAR(100) NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  subtotal_minor BIGINT NOT NULL DEFAULT 0,
  discount_minor BIGINT NOT NULL DEFAULT 0,
  tax_minor BIGINT NOT NULL DEFAULT 0,
  total_minor BIGINT NOT NULL DEFAULT 0,
  paid_minor BIGINT NOT NULL DEFAULT 0,
  due_minor BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL CHECK (status IN ('paid', 'partial', 'due', 'void')),
  created_by UUID REFERENCES auth.users(id),
  client_generated_id UUID UNIQUE NOT NULL, -- Idempotency key
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Sales Items
CREATE TABLE IF NOT EXISTS sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  qty NUMERIC(12, 3) NOT NULL,
  unit_price_minor BIGINT NOT NULL,
  discount_minor BIGINT NOT NULL DEFAULT 0
);

-- 11. Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  amount_minor BIGINT NOT NULL,
  method VARCHAR(50) NOT NULL CHECK (method IN ('cash', 'bkash', 'nagad', 'card', 'bank')),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('in', 'out')),
  client_generated_id UUID UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  amount_minor BIGINT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  diff_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-tenant isolation based on auth.jwt() -> 'business_id'
-- ====================================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to extract user's business_id from JWT
CREATE OR REPLACE FUNCTION current_business_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.business_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Generic policy: users can only see and write rows in their assigned business
CREATE POLICY "Tenant isolation for businesses" ON businesses
  FOR ALL USING (id = current_business_id() OR owner_id = auth.uid());

CREATE POLICY "Tenant isolation for branches" ON branches
  FOR ALL USING (business_id = current_business_id());

CREATE POLICY "Tenant isolation for profiles" ON profiles
  FOR ALL USING (business_id = current_business_id() OR id = auth.uid());

CREATE POLICY "Tenant isolation for products" ON products
  FOR ALL USING (business_id = current_business_id());

CREATE POLICY "Tenant isolation for customers" ON customers
  FOR ALL USING (business_id = current_business_id());

CREATE POLICY "Tenant isolation for sales_invoices" ON sales_invoices
  FOR ALL USING (business_id = current_business_id());

CREATE POLICY "Tenant isolation for stock_movements" ON stock_movements
  FOR ALL USING (business_id = current_business_id());

CREATE POLICY "Tenant isolation for payments" ON payments
  FOR ALL USING (business_id = current_business_id());

CREATE POLICY "Tenant isolation for expenses" ON expenses
  FOR ALL USING (business_id = current_business_id());


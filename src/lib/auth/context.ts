import { AuthService, type AuthSession } from './service';

/**
 * Returns the current user's session from localStorage cache.
 * All pages should use this to get businessId, branchId, fullName, etc.
 */
export function getCurrentSession(): AuthSession | null {
  return AuthService.getCachedSession();
}

/**
 * Get the current businessId from session, falling back to demo for seed data.
 */
export function getBusinessId(): string {
  const session = getCurrentSession();
  return session?.user?.businessId || 'demo-business-001';
}

/**
 * Get the current branchId from session.
 */
export function getBranchId(): string {
  const session = getCurrentSession();
  return session?.user?.branchId || 'demo-branch-001';
}

/**
 * Get the current user's display name.
 */
export function getUserName(): string {
  const session = getCurrentSession();
  return session?.user?.fullName || 'Store Owner';
}

/**
 * Get the current store/business name.
 */
export function getStoreName(): string {
  const session = getCurrentSession();
  return session?.user?.storeName || (typeof window !== 'undefined' ? localStorage.getItem('storeos_store_name') : null) || 'StoreOS Retail';
}

/**
 * Get the current user's email.
 */
export function getUserEmail(): string {
  const session = getCurrentSession();
  return session?.user?.email || 'owner@storeos.com';
}

/**
 * Get the current user's role.
 */
export function getUserRole(): string {
  const session = getCurrentSession();
  const role = session?.user?.role || 'owner';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

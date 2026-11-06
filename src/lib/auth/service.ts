import { supabase } from '../db/supabase/client';
import type { UserProfile } from '../db/types';

const OFFLINE_SESSION_KEY = 'storeos_cached_session';

export interface AuthSession {
  user: UserProfile;
  token?: string;
  isOfflineSession: boolean;
  needsEmailVerification?: boolean;
  expiresAt: number;
}

export class AuthService {
  /**
   * Save session to localStorage so the app remains usable offline
   */
  static cacheSession(session: AuthSession) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(session));
  }

  /**
   * Retrieve cached offline session
   */
  static getCachedSession(): AuthSession | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(OFFLINE_SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Clear session on logout
   */
  static clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(OFFLINE_SESSION_KEY);
  }

  /**
   * Register a new user in Supabase Auth & local storage
   */
  static async signUp(
    email: string,
    password: string,
    fullName: string,
    storeName: string = 'My Store',
    role: 'owner' | 'manager' | 'cashier' = 'owner'
  ): Promise<AuthSession> {
    const isOnline = typeof window !== 'undefined' ? window.navigator.onLine : false;
    const businessId = `biz-${Date.now().toString(36)}`;
    const branchId = 'main-branch';

    if (isOnline) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
              business_id: businessId,
              store_name: storeName,
            },
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.user) {
          // In Supabase, if email confirmation is turned ON, data.session is null until user verifies via link
          const needsVerification = !data.session;

          const session: AuthSession = {
            user: {
              id: data.user.id,
              businessId,
              role,
              branchId,
              fullName,
              email,
            },
            token: data.session?.access_token,
            isOfflineSession: false,
            needsEmailVerification: needsVerification,
            expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
          };

          // Cache session if already verified or auto-confirmed
          if (!needsVerification) {
            this.cacheSession(session);
          }

          return session;
        }
      } catch (err: any) {
        throw new Error(err.message || 'Failed to sign up in cloud auth');
      }
    }

    // Offline / Local Registration fallback
    const offlineSession: AuthSession = {
      user: {
        id: `usr-${Date.now().toString(36)}`,
        businessId,
        role,
        branchId,
        fullName,
        email,
      },
      isOfflineSession: true,
      needsEmailVerification: false,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
    };
    this.cacheSession(offlineSession);
    return offlineSession;
  }

  /**
   * Resend signup email confirmation
   */
  static async resendVerificationEmail(email: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
        },
      });
      if (error) throw new Error(error.message);
      return true;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to resend confirmation email');
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login?reset=true` : undefined,
      });
      if (error) throw new Error(error.message);
      return true;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to send password reset email');
    }
  }

  /**
   * Fast offline-first login: verifies network, or falls back to valid cached credentials/demo
   */
  static async login(email: string, password?: string): Promise<AuthSession> {
    const isOnline = typeof window !== 'undefined' ? window.navigator.onLine : false;

    if (isOnline) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: password || 'default123',
        });

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            throw new Error('Your email address has not been confirmed yet. Please check your inbox for the verification link.');
          }
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            throw new Error('Invalid email or password. Please verify your credentials or sign up.');
          }
          throw new Error(error.message);
        }

        if (data?.user) {
          const session: AuthSession = {
            user: {
              id: data.user.id,
              businessId: (data.user.user_metadata?.business_id as string) || 'demo-business-001',
              role: (data.user.user_metadata?.role as any) || 'owner',
              branchId: 'demo-branch-001',
              fullName: data.user.user_metadata?.full_name || 'Store User',
              email: data.user.email || email,
            },
            token: data.session?.access_token,
            isOfflineSession: false,
            needsEmailVerification: false,
            expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
          };
          this.cacheSession(session);
          return session;
        }
      } catch (err: any) {
        // If it's a specific auth failure (wrong password, unconfirmed email), rethrow so user knows
        if (
          err.message.includes('confirmed') ||
          err.message.includes('Invalid') ||
          err.message.includes('password')
        ) {
          throw err;
        }
        // Fall back to offline cached session for network fetch issues
      }
    }

    // Offline / Demo Mode fallback
    const cached = this.getCachedSession();
    if (cached) {
      return { ...cached, isOfflineSession: true };
    }

    // Default demo session for initial setup
    const demoSession: AuthSession = {
      user: {
        id: 'usr-demo-001',
        businessId: 'demo-business-001',
        role: 'owner',
        branchId: 'demo-branch-001',
        fullName: 'John Doe',
        email: email || 'owner@storeos.com',
      },
      isOfflineSession: true,
      needsEmailVerification: false,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
    };
    this.cacheSession(demoSession);
    return demoSession;
  }
}


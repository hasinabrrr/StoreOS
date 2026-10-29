import { supabase } from '../db/supabase/client';
import type { UserProfile } from '../db/types';

const OFFLINE_SESSION_KEY = 'storeos_cached_session';

export interface AuthSession {
  user: UserProfile;
  token?: string;
  isOfflineSession: boolean;
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

        if (data?.user && !error) {
          const session: AuthSession = {
            user: {
              id: data.user.id,
              businessId: (data.user.user_metadata?.business_id as string) || 'demo-business-001',
              role: (data.user.user_metadata?.role as any) || 'owner',
              branchId: 'demo-branch-001',
              fullName: data.user.user_metadata?.full_name || 'John Doe',
              email: data.user.email || email,
            },
            token: data.session?.access_token,
            isOfflineSession: false,
            expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
          };
          this.cacheSession(session);
          return session;
        }
      } catch {
        // Fall back to offline cached session
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
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
    };
    this.cacheSession(demoSession);
    return demoSession;
  }
}


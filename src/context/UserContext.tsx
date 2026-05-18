import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import {
    useCurrentUser,
    useLogin,
    useLogout,
    useSignup,
} from 'api/hooks/useAuth';
import type { SignupPayload } from 'api/authApi';
import { USER_ROLE } from 'constants';
import type { SubscriptionPlan, SubscriptionStatus, UserRole } from 'types';

export type PaymentType = 'card' | 'paypal' | 'venmo' | 'other';

export interface NotificationPrefs {
    email: boolean;
    sms: boolean;
    push: boolean;
}

export interface UserFriend {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    pending?: boolean;
}

export interface User {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    dob?: string;
    countryOfBirth?: string;
    preferredAirport?: string;
    paymentType?: PaymentType;
    notifications?: NotificationPrefs;
    friends?: UserFriend[];
    /** Authoritative role from the backend's `users.role` column. Drives
     *  admin bypass on paywalls and tier gates — never derive this from the
     *  client or trust localStorage. */
    role: UserRole;
    /** Subscription state, re-shaped to camelCase from the wire format.
     *  Server-authoritative — the Stripe webhook is the source of truth. */
    subscriptionPlan: SubscriptionPlan;
    subscriptionStatus: SubscriptionStatus;
    /** Free-tier saved-trip ceiling for this user. Paid members and admins
     *  ignore this — they have no cap. UI should still display it as
     *  "{tripCount} / {effectiveTripCap}" for free users. */
    effectiveTripCap: number;
    /** Server-derived flag — true when the user has an active paid plan and
     *  a status that warrants paid access (trial / active / past-due grace).
     *  Prefer this over re-deriving from plan + status on the client. */
    isPaidMember: boolean;
    /** ISO-8601 timestamps, set by the Stripe webhook. Null when there's no
     *  active subscription / trial. Components render them as "trial ends in
     *  X days" / "renews on Y" — see SubscriptionSection. */
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    /** True when the user has cancelled via the Customer Portal but the
     *  current period is still active. */
    cancelAtPeriodEnd: boolean;
}

/**
 * Fields the Python backend doesn't yet model (friends list, payment type,
 * notification prefs, etc). We store them per-user in localStorage and merge
 * them on top of the authenticated user from /auth/me.
 */
type LocalOverlay = Pick<
    User,
    | 'phone'
    | 'dob'
    | 'countryOfBirth'
    | 'preferredAirport'
    | 'paymentType'
    | 'notifications'
    | 'friends'
>;

interface UserContextValue {
    user: User | null;
    isLoading: boolean;
    /** True when the authenticated user has admin role. Use this — not a
     *  direct `user.role === 'admin'` comparison — so the source of truth
     *  stays one place. */
    isAdmin: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (payload: SignupPayload) => Promise<void>;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
    loginError: Error | null;
    signupError: Error | null;
    isLoggingIn: boolean;
    isSigningUp: boolean;
}

const OVERLAY_KEY_PREFIX = 'datryp:user-overlay:';

const loadOverlay = (userId: string): LocalOverlay => {
    try {
        const raw = localStorage.getItem(OVERLAY_KEY_PREFIX + userId);
        if (!raw) return {};
        return JSON.parse(raw) as LocalOverlay;
    } catch {
        return {};
    }
};

const saveOverlay = (userId: string, overlay: LocalOverlay): void => {
    try {
        localStorage.setItem(
            OVERLAY_KEY_PREFIX + userId,
            JSON.stringify(overlay)
        );
    } catch {
        // ignore quota errors
    }
};

const UserContext = createContext<UserContextValue | null>(null);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const { data: me, isLoading } = useCurrentUser();
    const loginMutation = useLogin();
    const signupMutation = useSignup();
    const logoutFn = useLogout();

    const [overlay, setOverlay] = useState<LocalOverlay>({});

    useEffect(() => {
        if (me?.id) {
            setOverlay(loadOverlay(me.id));
        } else {
            setOverlay({});
        }
    }, [me?.id]);

    useEffect(() => {
        if (me?.id) saveOverlay(me.id, overlay);
    }, [me?.id, overlay]);

    const user: User | null = useMemo(() => {
        if (!me) return null;
        return {
            id: me.id,
            name: me.name ?? me.email,
            email: me.email,
            role: me.role,
            subscriptionPlan: me.subscription_plan,
            subscriptionStatus: me.subscription_status,
            effectiveTripCap: me.effective_trip_cap,
            isPaidMember: me.is_paid_member,
            trialEndsAt: me.trial_ends_at,
            currentPeriodEnd: me.current_period_end,
            cancelAtPeriodEnd: me.subscription_cancel_at_period_end,
            ...overlay,
        };
    }, [me, overlay]);

    const isAdmin = user?.role === USER_ROLE.ADMIN;

    const login = useCallback(
        async (email: string, password: string) => {
            await loginMutation.mutateAsync({ email, password });
        },
        [loginMutation]
    );

    const signup = useCallback(
        async (payload: SignupPayload) => {
            await signupMutation.mutateAsync(payload);
        },
        [signupMutation]
    );

    const logout = useCallback(() => {
        logoutFn();
        setOverlay({});
    }, [logoutFn]);

    const updateUser = useCallback((updates: Partial<User>) => {
        setOverlay((prev) => ({ ...prev, ...updates }));
    }, []);

    const value = useMemo<UserContextValue>(
        () => ({
            user,
            isLoading,
            isAdmin,
            login,
            signup,
            logout,
            updateUser,
            loginError: loginMutation.error,
            signupError: signupMutation.error,
            isLoggingIn: loginMutation.isPending,
            isSigningUp: signupMutation.isPending,
        }),
        [
            user,
            isLoading,
            isAdmin,
            login,
            signup,
            logout,
            updateUser,
            loginMutation.error,
            signupMutation.error,
            loginMutation.isPending,
            signupMutation.isPending,
        ]
    );

    return (
        <UserContext.Provider value={value}>{children}</UserContext.Provider>
    );
};

export const useUser = () => {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser must be used within UserProvider');
    return ctx;
};

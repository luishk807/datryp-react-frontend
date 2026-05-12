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
            ...overlay,
        };
    }, [me, overlay]);

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

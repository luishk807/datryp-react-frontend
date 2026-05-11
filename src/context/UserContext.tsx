import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

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

interface UserContextValue {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
}

const STORAGE_KEY = 'datryp:user';

const DEFAULT_USER: User = {
    id: 'luis@example.com',
    name: 'Luis',
    email: 'luis@example.com',
    phone: '+1 555 123 4567',
    dob: '1990-05-20',
    countryOfBirth: 'US',
    preferredAirport: 'JFK',
};

const loadUser = (): User | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_USER;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.name) {
            return parsed as User;
        }
        return DEFAULT_USER;
    } catch {
        return DEFAULT_USER;
    }
};

const UserContext = createContext<UserContextValue | null>(null);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(loadUser);

    useEffect(() => {
        try {
            if (user) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {
            // ignore quota errors
        }
    }, [user]);

    const login = useCallback((next: User) => setUser(next), []);
    const logout = useCallback(() => setUser(null), []);
    const updateUser = useCallback((updates: Partial<User>) => {
        setUser((prev) => (prev ? { ...prev, ...updates } : prev));
    }, []);

    return (
        <UserContext.Provider value={{ user, login, logout, updateUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser must be used within UserProvider');
    return ctx;
};

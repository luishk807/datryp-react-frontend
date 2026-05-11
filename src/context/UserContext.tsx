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

interface UserContextValue {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
}

const STORAGE_KEY = 'datryp:user';

const DEFAULT_FRIENDS: UserFriend[] = [
    {
        id: 'joanna@example.com',
        name: 'Joanna Tam',
        email: 'joanna@example.com',
        phone: '+1 555 234 5678',
    },
    {
        id: 'alberto@example.com',
        name: 'Alberto Wesker',
        email: 'alberto@example.com',
        phone: '+1 555 345 6789',
    },
    {
        id: 'jessica@example.com',
        name: 'Jessica Ruan',
        email: 'jessica@example.com',
        phone: '+1 555 456 7890',
    },
    {
        id: 'chris@example.com',
        name: 'Chris Redfield',
        email: 'chris@example.com',
        phone: '+1 555 567 8901',
    },
    {
        id: 'leon@example.com',
        name: 'Leon Kennedy',
        email: 'leon@example.com',
        phone: '+1 555 678 9012',
    },
];

const DEFAULT_USER: User = {
    id: 'luis@example.com',
    name: 'Luis',
    email: 'luis@example.com',
    phone: '+1 555 123 4567',
    dob: '1990-05-20',
    countryOfBirth: 'US',
    preferredAirport: 'JFK',
    friends: DEFAULT_FRIENDS,
};

const loadUser = (): User | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_USER;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.name) {
            const stored = parsed as User;
            if (!stored.friends) {
                stored.friends = DEFAULT_FRIENDS;
            }
            return stored;
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

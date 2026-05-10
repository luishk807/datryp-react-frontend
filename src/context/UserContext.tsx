import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

export interface User {
    id: string;
    name: string;
    email?: string;
}

interface UserContextValue {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
}

const STORAGE_KEY = 'datryp:user';

const loadUser = (): User | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.name) {
            return parsed as User;
        }
        return null;
    } catch {
        return null;
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

    return (
        <UserContext.Provider value={{ user, login, logout }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser must be used within UserProvider');
    return ctx;
};

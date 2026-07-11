import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

let mockUser: Record<string, unknown> | null = null;
let mockIsAdmin = false;
const mockLogin = vi.fn();
const mockLogout = vi.fn();
vi.mock('context/UserContext', () => ({
    useUser: () => ({
        user: mockUser,
        isAdmin: mockIsAdmin,
        login: mockLogin,
        logout: mockLogout,
    }),
}));

// Heavy children — stubbed so the Header test stays focused on chrome:
// landmarks, the signed-in/anonymous branches, and the account menu.
vi.mock('components/SearchBar', () => ({
    default: () => <div data-testid="search-bar" />,
}));
vi.mock('components/NotificationBell', () => ({
    default: () => <div data-testid="notification-bell" />,
}));
vi.mock('components/common/LoginBtn', () => ({
    default: () => <button type="button">Login</button>,
}));

import Header from './index';

const signedInUser = {
    id: 'u1',
    name: 'Ada',
    email: 'ada@example.com',
    profileImageUrl: null,
    isPaidMember: false,
};

beforeEach(() => {
    mockNavigate.mockReset();
    mockLogin.mockReset();
    mockLogout.mockReset();
    mockUser = null;
    mockIsAdmin = false;
});

describe('Header — anonymous', () => {
    it('renders a banner with a login affordance and a sign-up link', () => {
        renderWithProviders(<Header />);
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Login' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Sign Up' })
        ).toHaveAttribute('href', '/signup');
        // No account menu trigger for anonymous visitors.
        expect(
            screen.queryByRole('button', { name: /account menu/i })
        ).not.toBeInTheDocument();
    });

    it('renders the search bar only when withSearch is set', () => {
        const { rerender } = renderWithProviders(<Header />);
        expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
        rerender(<Header withSearch />);
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    });
});

describe('Header — signed in', () => {
    beforeEach(() => {
        mockUser = { ...signedInUser };
    });

    it('renders the notification bell and a named account-menu trigger', () => {
        renderWithProviders(<Header />);
        expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
        const trigger = screen.getByRole('button', {
            name: 'Account menu for Ada',
        });
        expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens an account menu with the primary destinations', async () => {
        renderWithProviders(<Header />);
        const trigger = screen.getByRole('button', {
            name: 'Account menu for Ada',
        });
        await userEvent.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        const menu = screen.getByRole('menu');
        expect(
            within(menu).getByRole('menuitem', { name: 'Account' })
        ).toBeInTheDocument();
        expect(
            within(menu).getByRole('menuitem', { name: 'My Trips' })
        ).toBeInTheDocument();
        expect(
            within(menu).getByRole('menuitem', { name: 'Logout' })
        ).toBeInTheDocument();
    });

    it('moves focus onto the first menu item on open and Tab walks the items', async () => {
        renderWithProviders(<Header />);
        const trigger = screen.getByRole('button', {
            name: 'Account menu for Ada',
        });
        await userEvent.click(trigger);
        const menu = screen.getByRole('menu');
        const items = within(menu).getAllByRole('menuitem');
        await waitFor(() => expect(items[0]).toHaveFocus());
        await userEvent.tab();
        expect(items[1]).toHaveFocus();
        // Tab navigated between items rather than dismissing the menu.
        expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('opens the account menu via keyboard and focuses the first item', async () => {
        renderWithProviders(<Header />);
        const trigger = screen.getByRole('button', {
            name: 'Account menu for Ada',
        });
        trigger.focus();
        await userEvent.keyboard('{Enter}');
        const menu = screen.getByRole('menu');
        await waitFor(() =>
            expect(within(menu).getAllByRole('menuitem')[0]).toHaveFocus()
        );
    });

    it('closes on Escape and returns focus to the account trigger', async () => {
        renderWithProviders(<Header />);
        const trigger = screen.getByRole('button', {
            name: 'Account menu for Ada',
        });
        await userEvent.click(trigger);
        await waitFor(() =>
            expect(
                within(screen.getByRole('menu')).getAllByRole('menuitem')[0]
            ).toHaveFocus()
        );
        await userEvent.keyboard('{Escape}');
        await waitFor(() =>
            expect(screen.queryByRole('menu')).not.toBeInTheDocument()
        );
        await waitFor(() => expect(trigger).toHaveFocus());
    });

    it('navigates from a menu item', async () => {
        renderWithProviders(<Header />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Account menu for Ada' })
        );
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Account' })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/account');
    });

    it('logs out and returns home from the Logout item', async () => {
        renderWithProviders(<Header />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Account menu for Ada' })
        );
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Logout' })
        );
        expect(mockLogout).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('offers the Upgrade to Pro item to free members', async () => {
        renderWithProviders(<Header />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Account menu for Ada' })
        );
        expect(
            screen.getByRole('menuitem', { name: 'Upgrade to Pro' })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('menuitem', { name: 'Admin dashboard' })
        ).not.toBeInTheDocument();
    });

    it('reveals the Admin dashboard item for admins', async () => {
        mockIsAdmin = true;
        renderWithProviders(<Header />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Account menu for Ada' })
        );
        expect(
            screen.getByRole('menuitem', { name: 'Admin dashboard' })
        ).toBeInTheDocument();
    });

    it('opens the mobile drawer from the burger button', async () => {
        renderWithProviders(<Header />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Open menu' })
        );
        expect(
            screen.getByRole('button', { name: 'Close menu' })
        ).toBeInTheDocument();
    });
});

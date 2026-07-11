import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, within } from '../../test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

let mockUser: Record<string, unknown> | null = null;
let mockIsAdmin = false;
const mockLogout = vi.fn();
vi.mock('context/UserContext', () => ({
    useUser: () => ({
        user: mockUser,
        isAdmin: mockIsAdmin,
        logout: mockLogout,
    }),
}));

vi.mock('components/SearchBar', () => ({
    default: () => <div data-testid="search-bar" />,
}));
vi.mock('components/common/MenuFooterLinks', () => ({
    default: () => <div data-testid="menu-footer-links" />,
}));

import BottomNav from './index';

const signedInUser = {
    id: 'u1',
    name: 'Ada',
    email: 'ada@example.com',
    profileImageUrl: null,
    isPaidMember: false,
};

beforeEach(() => {
    mockNavigate.mockReset();
    mockLogout.mockReset();
    mockUser = null;
    mockIsAdmin = false;
});

describe('BottomNav — guest', () => {
    it('renders a primary-navigation landmark with Home + Explore', () => {
        renderWithProviders(<BottomNav />, { route: '/' });
        const nav = screen.getByRole('navigation', {
            name: 'Primary navigation',
        });
        const home = within(nav).getByRole('link', { name: 'Home' });
        expect(home).toHaveAttribute('href', '/');
        expect(home).toHaveClass('is-active');
        expect(
            within(nav).getByRole('button', { name: 'Explore' })
        ).toBeInTheDocument();
    });

    it('opens a search overlay dialog from Explore', async () => {
        renderWithProviders(<BottomNav />, { route: '/' });
        await userEvent.click(
            screen.getByRole('button', { name: 'Explore' })
        );
        expect(
            screen.getByRole('dialog', { name: 'Search' })
        ).toBeInTheDocument();
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    });
});

describe('BottomNav — signed in', () => {
    beforeEach(() => {
        mockUser = { ...signedInUser };
    });

    it('renders the five primary destinations as named buttons', () => {
        renderWithProviders(<BottomNav />, { route: '/' });
        const nav = screen.getByRole('navigation', {
            name: 'Primary mobile navigation',
        });
        ['Home', 'Explore', 'My Trips', 'Bucket list', 'Travel Atlas'].forEach(
            (name) =>
                expect(
                    within(nav).getByRole('button', { name })
                ).toBeInTheDocument()
        );
    });

    it('marks the active tab based on the current route', () => {
        renderWithProviders(<BottomNav />, { route: '/trips' });
        expect(
            screen.getByRole('button', { name: 'My Trips' })
        ).toHaveClass('is-active');
        expect(screen.getByRole('button', { name: 'Home' })).not.toHaveClass(
            'is-active'
        );
    });

    it('navigates when a destination is tapped', async () => {
        renderWithProviders(<BottomNav />, { route: '/' });
        await userEvent.click(
            screen.getByRole('button', { name: 'Bucket list' })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/bucket-list');
    });

    it('opens the search overlay dialog from Explore', async () => {
        renderWithProviders(<BottomNav />, { route: '/' });
        await userEvent.click(
            screen.getByRole('button', { name: 'Explore' })
        );
        expect(
            screen.getByRole('dialog', { name: 'Search' })
        ).toBeInTheDocument();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../../test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

const mockLogout = vi.fn();
let mockUser: { id: string; name: string; email?: string } | null = {
    id: 'u1',
    name: 'Ada Admin',
    email: 'ada@example.com',
};
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, logout: mockLogout }),
}));

import Sidebar from './index';

beforeEach(() => {
    mockUser = { id: 'u1', name: 'Ada Admin', email: 'ada@example.com' };
});

const noop = () => {};

describe('Sidebar', () => {
    it('renders the admin nav with every section link', () => {
        renderWithProviders(<Sidebar open={false} onClose={noop} />);
        expect(
            screen.getByRole('complementary', { name: 'Admin navigation' })
        ).toBeInTheDocument();
        for (const label of [
            'Overview',
            'Subscription',
            'Activity',
            'Users',
            'Cache',
            'Costs',
            'Settings',
        ]) {
            expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
        }
    });

    it('shows the signed-in identity and a back-to-site link', () => {
        renderWithProviders(<Sidebar open={false} onClose={noop} />);
        expect(screen.getByText('Ada Admin')).toBeInTheDocument();
        expect(screen.getByText('ada@example.com')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Back to site' })
        ).toBeInTheDocument();
    });

    it('logs out, closes the drawer, and navigates home', async () => {
        const onClose = vi.fn();
        renderWithProviders(<Sidebar open onClose={onClose} />);
        await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
        expect(mockLogout).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('closes the drawer when the backdrop is clicked', async () => {
        const onClose = vi.fn();
        const { container } = renderWithProviders(
            <Sidebar open onClose={onClose} />
        );
        const backdrop = container.querySelector('.dashboard-sidebar-backdrop');
        expect(backdrop).not.toBeNull();
        await userEvent.click(backdrop as HTMLElement);
        expect(onClose).toHaveBeenCalled();
    });

    it('applies the open modifier class when the drawer is open', () => {
        const { container } = renderWithProviders(<Sidebar open onClose={noop} />);
        expect(
            container.querySelector('.dashboard-sidebar.is-open')
        ).toBeInTheDocument();
    });

    it('renders without an identity block when there is no user', () => {
        mockUser = null;
        renderWithProviders(<Sidebar open={false} onClose={noop} />);
        expect(screen.queryByText('Ada Admin')).not.toBeInTheDocument();
        // Nav + logout still render.
        expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });
});

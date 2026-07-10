import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';

// Outlet renders the active nested route — stub it so the shell can be
// rendered standalone without a full router tree.
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    Outlet: () => <div data-testid="outlet">section content</div>,
}));

// Sidebar is covered by its own test; stub it to a passthrough that exposes
// the drawer `open` state and an onClose trigger so the shell wiring is
// observable in isolation.
let lastOpen = false;
vi.mock('./Sidebar', () => ({
    default: ({ open, onClose }: { open: boolean; onClose: () => void }) => {
        lastOpen = open;
        return (
            <aside data-testid="sidebar" data-open={open ? 'true' : 'false'}>
                <button type="button" onClick={onClose}>
                    close-sidebar
                </button>
            </aside>
        );
    },
}));

import Dashboard from './index';

describe('Dashboard shell', () => {
    it('renders the sidebar, mobile toggle, and the routed outlet', () => {
        renderWithProviders(<Dashboard />);
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('outlet')).toHaveTextContent('section content');
        expect(
            screen.getByRole('button', { name: 'Open menu' })
        ).toBeInTheDocument();
    });

    it('opens the mobile drawer via the hamburger, then closes it', async () => {
        renderWithProviders(<Dashboard />);
        expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');

        await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
        expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
        expect(lastOpen).toBe(true);

        await userEvent.click(
            screen.getByRole('button', { name: 'close-sidebar' })
        );
        expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');
    });
});

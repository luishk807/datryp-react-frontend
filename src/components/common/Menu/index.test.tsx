import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../../test/renderWithProviders';
import Menu, { MenuActionItem } from './index';

interface HarnessProps {
    onClose?: () => void;
    onProfile?: () => void;
    fullScreenOnMobile?: boolean;
    paperClassName?: string;
}

const MenuHarness = ({
    onClose,
    onProfile,
    fullScreenOnMobile,
    paperClassName,
}: HarnessProps) => {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    return (
        <>
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={Boolean(anchor)}
                onClick={(e) => setAnchor(e.currentTarget)}
            >
                Open menu
            </button>
            <Menu
                anchorEl={anchor}
                fullScreenOnMobile={fullScreenOnMobile}
                paperClassName={paperClassName}
                onClose={() => {
                    setAnchor(null);
                    onClose?.();
                }}
            >
                <MenuActionItem
                    icon={<span data-testid="profile-icon" />}
                    label="Profile"
                    onClick={onProfile ?? (() => {})}
                />
                <MenuActionItem
                    label="Logout"
                    tone="danger"
                    className="logout-item"
                    onClick={() => {}}
                />
            </Menu>
        </>
    );
};

describe('Menu', () => {
    it('renders no menu popup while the anchor is null', () => {
        renderWithProviders(<MenuHarness />);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Open menu' })
        ).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens a role="menu" popup with the expected items', async () => {
        renderWithProviders(<MenuHarness />);
        const trigger = screen.getByRole('button', { name: 'Open menu' });
        await userEvent.click(trigger);
        // MUI marks the rest of the page aria-hidden while the menu is open,
        // so assert on the captured element rather than re-querying by role.
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        const menu = screen.getByRole('menu');
        expect(
            within(menu).getByRole('menuitem', { name: 'Profile' })
        ).toBeInTheDocument();
        expect(
            within(menu).getByRole('menuitem', { name: 'Logout' })
        ).toBeInTheDocument();
    });

    it('fires the item handler when a menu item is clicked', async () => {
        const onProfile = vi.fn();
        renderWithProviders(<MenuHarness onProfile={onProfile} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Open menu' })
        );
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Profile' })
        );
        expect(onProfile).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape is pressed', async () => {
        const onClose = vi.fn();
        renderWithProviders(<MenuHarness onClose={onClose} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Open menu' })
        );
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(screen.queryByRole('menu')).not.toBeInTheDocument()
        );
    });

    it('renders a mobile close button that calls onClose in full-screen mode', async () => {
        const onClose = vi.fn();
        renderWithProviders(
            <MenuHarness onClose={onClose} fullScreenOnMobile />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Open menu' })
        );
        expect(document.querySelector('.common-menu--full-mobile')).toBeTruthy();
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('stacks a custom paperClassName on the shared surface class', async () => {
        renderWithProviders(<MenuHarness paperClassName="account-menu-paper" />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Open menu' })
        );
        expect(
            document.querySelector('.common-menu.account-menu-paper')
        ).toBeTruthy();
    });

    it('applies tone + icon + className on MenuActionItem', async () => {
        renderWithProviders(<MenuHarness />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Open menu' })
        );
        const profile = screen.getByRole('menuitem', { name: 'Profile' });
        expect(profile).toHaveClass('common-menu-item', 'tone-default');
        expect(within(profile).getByTestId('profile-icon')).toBeInTheDocument();

        const logout = screen.getByRole('menuitem', { name: 'Logout' });
        expect(logout).toHaveClass('tone-danger', 'logout-item');
    });
});

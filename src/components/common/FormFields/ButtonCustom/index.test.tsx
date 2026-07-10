import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ButtonCustom from './index';

describe('ButtonCustom', () => {
    it('renders its label as the button text', () => {
        render(<ButtonCustom label="Save Trip" />);
        expect(
            screen.getByRole('button', { name: 'Save Trip' })
        ).toBeInTheDocument();
    });

    it('prefers children over label when both are provided', () => {
        render(
            <ButtonCustom label="ignored">
                <span>Child content</span>
            </ButtonCustom>
        );
        expect(screen.getByRole('button')).toHaveTextContent('Child content');
    });

    it('fires onClick when pressed', async () => {
        const onClick = vi.fn();
        render(<ButtonCustom label="Go" onClick={onClick} />);
        await userEvent.click(screen.getByRole('button', { name: 'Go' }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled and does not fire onClick when disabled', async () => {
        const onClick = vi.fn();
        render(<ButtonCustom label="Go" onClick={onClick} disabled />);
        const btn = screen.getByRole('button', { name: 'Go' });
        expect(btn).toBeDisabled();
        await userEvent.click(btn);
        expect(onClick).not.toHaveBeenCalled();
    });

    it('exposes an accessible name via ariaLabel for icon-only buttons', () => {
        render(<ButtonCustom ariaLabel="Open account menu" />);
        expect(
            screen.getByRole('button', { name: 'Open account menu' })
        ).toBeInTheDocument();
    });

    it('forwards popup ARIA (haspopup / expanded / controls) for menu triggers', () => {
        render(
            <ButtonCustom
                ariaLabel="menu"
                ariaHasPopup="menu"
                ariaExpanded
                ariaControls="account-menu"
            />
        );
        const btn = screen.getByRole('button', { name: 'menu' });
        expect(btn).toHaveAttribute('aria-haspopup', 'menu');
        expect(btn).toHaveAttribute('aria-expanded', 'true');
        expect(btn).toHaveAttribute('aria-controls', 'account-menu');
    });

    it('applies the native button type when provided', () => {
        render(<ButtonCustom label="Submit" nativeType="submit" />);
        expect(
            screen.getByRole('button', { name: 'Submit' })
        ).toHaveAttribute('type', 'submit');
    });
});

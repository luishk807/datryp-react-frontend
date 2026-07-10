import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../../test/renderWithProviders';
import IconConfirmButton from './index';

const icon = <span data-testid="trash-icon">x</span>;

describe('IconConfirmButton', () => {
    it('renders an icon-only trigger with an accessible name and no dialog', () => {
        renderWithProviders(
            <IconConfirmButton icon={icon} ariaLabel="Delete activity" />
        );
        expect(
            screen.getByRole('button', { name: 'Delete activity' })
        ).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders nothing in view mode', () => {
        const { container } = renderWithProviders(
            <IconConfirmButton icon={icon} ariaLabel="Delete activity" isViewMode />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('opens a confirmation dialog titled + described by its content', async () => {
        renderWithProviders(
            <IconConfirmButton
                icon={icon}
                ariaLabel="Delete activity"
                title="Delete this activity"
            >
                This cannot be undone.
            </IconConfirmButton>
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Delete activity' })
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Delete this activity',
        });
        expect(
            within(dialog).getByText('This cannot be undone.')
        ).toBeInTheDocument();
        expect(
            within(dialog).getByRole('button', { name: 'Agree' })
        ).toBeInTheDocument();
        expect(
            within(dialog).getByRole('button', { name: 'Cancel' })
        ).toBeInTheDocument();
    });

    it('fires onConfirm and closes when Agree is clicked', async () => {
        const onConfirm = vi.fn();
        renderWithProviders(
            <IconConfirmButton
                icon={icon}
                ariaLabel="Delete activity"
                title="Delete this activity"
                onConfirm={onConfirm}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Delete activity' })
        );
        await userEvent.click(
            within(screen.getByRole('dialog')).getByRole('button', {
                name: 'Agree',
            })
        );
        expect(onConfirm).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        );
    });

    it('closes without firing onConfirm when Cancel is clicked', async () => {
        const onConfirm = vi.fn();
        renderWithProviders(
            <IconConfirmButton
                icon={icon}
                ariaLabel="Delete activity"
                title="Delete this activity"
                onConfirm={onConfirm}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Delete activity' })
        );
        await userEvent.click(
            within(screen.getByRole('dialog')).getByRole('button', {
                name: 'Cancel',
            })
        );
        expect(onConfirm).not.toHaveBeenCalled();
        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        );
    });

    it('does not throw when confirmed without an onConfirm handler', async () => {
        renderWithProviders(
            <IconConfirmButton
                icon={icon}
                ariaLabel="Delete activity"
                title="Delete this activity"
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Delete activity' })
        );
        await userEvent.click(
            within(screen.getByRole('dialog')).getByRole('button', {
                name: 'Agree',
            })
        );
        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        );
    });

    it('applies a custom className to the trigger', () => {
        renderWithProviders(
            <IconConfirmButton
                icon={icon}
                ariaLabel="Delete activity"
                className="card-corner-x"
            />
        );
        expect(
            screen.getByRole('button', { name: 'Delete activity' })
        ).toHaveClass('card-corner-x');
    });
});

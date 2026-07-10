import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DialogBox from './index';

describe('DialogBox', () => {
    it('renders the trigger button and no dialog initially', () => {
        render(<DialogBox buttonLabel="Delete trip" title="Are you sure?" />);
        expect(
            screen.getByRole('button', { name: 'Delete trip' })
        ).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders nothing in view mode', () => {
        const { container } = render(
            <DialogBox buttonLabel="Delete trip" isViewMode />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('opens the dialog with title and content when the trigger is clicked', async () => {
        render(
            <DialogBox buttonLabel="Delete trip" title="Are you sure?">
                This cannot be undone.
            </DialogBox>
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Delete trip' })
        );
        const dialog = screen.getByRole('dialog', { name: 'Are you sure?' });
        expect(dialog).toBeInTheDocument();
        expect(
            within(dialog).getByText('This cannot be undone.')
        ).toBeInTheDocument();
    });

    it('uses default Confirm / Cancel labels', async () => {
        render(<DialogBox buttonLabel="Open" title="Title" />);
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        const dialog = screen.getByRole('dialog');
        expect(
            within(dialog).getByRole('button', { name: 'Confirm' })
        ).toBeInTheDocument();
        expect(
            within(dialog).getByRole('button', { name: 'Cancel' })
        ).toBeInTheDocument();
    });

    it('honours custom confirm / cancel labels', async () => {
        render(
            <DialogBox
                buttonLabel="Open"
                title="Title"
                confirmLabel="Delete"
                cancelLabel="Keep"
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        const dialog = screen.getByRole('dialog');
        expect(
            within(dialog).getByRole('button', { name: 'Delete' })
        ).toBeInTheDocument();
        expect(
            within(dialog).getByRole('button', { name: 'Keep' })
        ).toBeInTheDocument();
    });

    it('fires onConfirm and closes the dialog when Confirm is clicked', async () => {
        const onConfirm = vi.fn();
        render(
            <DialogBox
                buttonLabel="Open"
                title="Confirm?"
                onConfirm={onConfirm}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        const dialog = screen.getByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Confirm' })
        );
        expect(onConfirm).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        );
    });

    it('closes without firing onConfirm when Cancel is clicked', async () => {
        const onConfirm = vi.fn();
        render(
            <DialogBox
                buttonLabel="Open"
                title="Confirm?"
                onConfirm={onConfirm}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
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
        render(<DialogBox buttonLabel="Open" title="Confirm?" />);
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        await userEvent.click(
            within(screen.getByRole('dialog')).getByRole('button', {
                name: 'Confirm',
            })
        );
        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        );
    });

    it('styles the confirm button as destructive when destructive is set', async () => {
        render(
            <DialogBox
                buttonLabel="Open"
                title="Delete?"
                confirmLabel="Delete"
                destructive
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        const dialog = screen.getByRole('dialog');
        // The destructive flag tints the primary (confirm) button red.
        expect(
            within(dialog).getByRole('button', { name: 'Delete' })
        ).toHaveClass('datryp-dialog-destructive');
        // The wrapping dialog root carries the destructive modifier class.
        expect(dialog.closest('.datryp-dialog')).toHaveClass('is-destructive');
    });
});

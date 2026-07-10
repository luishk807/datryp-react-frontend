import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../../test/renderWithProviders';
import DeleteBtn from './index';

describe('DeleteBtn', () => {
    it('renders the trigger and no dialog initially', () => {
        renderWithProviders(<DeleteBtn />);
        expect(
            screen.getByRole('button', { name: 'Delete' })
        ).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders nothing in view mode', () => {
        const { container } = renderWithProviders(<DeleteBtn isViewMode />);
        expect(container).toBeEmptyDOMElement();
    });

    it('opens a confirmation naming the target', async () => {
        renderWithProviders(<DeleteBtn targetName="Tokyo 2026" />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Delete' })
        );
        const dialog = screen.getByRole('dialog', { name: 'Delete this item' });
        expect(within(dialog).getByText('Tokyo 2026')).toBeInTheDocument();
    });

    it('fires onConfirm and closes when the destructive confirm is clicked', async () => {
        const onConfirm = vi.fn();
        renderWithProviders(
            <DeleteBtn targetName="Tokyo 2026" onConfirm={onConfirm} />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Delete' })
        );
        const dialog = screen.getByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Delete' })
        );
        expect(onConfirm).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        );
    });
});

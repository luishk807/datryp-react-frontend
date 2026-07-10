import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../../test/renderWithProviders';
import SheetDatePicker from './index';

describe('SheetDatePicker', () => {
    it('renders a trigger button named by its label, showing the placeholder when unset', () => {
        renderWithProviders(
            <SheetDatePicker label="Trip date" onChange={() => {}} />
        );
        const trigger = screen.getByRole('button', { name: 'Trip date' });
        expect(trigger).toBeInTheDocument();
        expect(trigger).toHaveTextContent('Select date');
    });

    it('renders the formatted selected value', () => {
        renderWithProviders(
            <SheetDatePicker value="2026-08-15" onChange={() => {}} />
        );
        expect(screen.getByRole('button')).toHaveTextContent('Sat, Aug 15');
    });

    it('opens the sheet dialog on click and closes on Escape', async () => {
        renderWithProviders(
            <SheetDatePicker label="Trip date" onChange={() => {}} />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Trip date' })
        );
        expect(
            screen.getByRole('dialog', { name: 'Select date' })
        ).toBeInTheDocument();
        await userEvent.keyboard('{Escape}');
        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        );
    });

    it('keeps Done disabled until a day is picked, then commits the ISO date', async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <SheetDatePicker
                onChange={onChange}
                minDate="2026-08-01"
                maxDate="2026-08-31"
            />
        );
        await userEvent.click(screen.getByRole('button'));
        const dialog = screen.getByRole('dialog', { name: 'Select date' });
        const done = within(dialog).getByRole('button', { name: 'Done' });
        expect(done).toBeDisabled();

        const day = within(dialog).getByRole('button', { name: '20' });
        await userEvent.click(day);
        // a11y contract: the picked day advertises its state to a screen reader.
        expect(day).toHaveAttribute('aria-pressed', 'true');
        expect(done).toBeEnabled();

        await userEvent.click(done);
        expect(onChange).toHaveBeenCalledWith('2026-08-20');
        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        );
    });

    it('does not open when disabled', async () => {
        renderWithProviders(
            <SheetDatePicker label="Trip date" onChange={() => {}} disabled />
        );
        const trigger = screen.getByRole('button', { name: 'Trip date' });
        expect(trigger).toBeDisabled();
        await userEvent.click(trigger);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});

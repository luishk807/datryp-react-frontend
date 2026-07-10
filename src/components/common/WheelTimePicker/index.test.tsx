import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../../test/renderWithProviders';
import WheelTimePicker from './index';

// jsdom doesn't implement Element.scrollTo; the wheel calls it on tap /
// keyboard move. Stub it so `goTo` doesn't throw. Assigned once — Vitest
// isolates modules per file so this never leaks to other suites.
if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
}

describe('WheelTimePicker', () => {
    it('renders a trigger with its label and the placeholder when unset', () => {
        renderWithProviders(
            <WheelTimePicker label="Depart" onChange={() => {}} />
        );
        const trigger = screen.getByRole('button');
        expect(trigger).toHaveTextContent('Depart');
        expect(trigger).toHaveTextContent('Select time');
    });

    it('renders the 12-hour formatted value', () => {
        renderWithProviders(
            <WheelTimePicker value="14:30" onChange={() => {}} />
        );
        expect(screen.getByRole('button')).toHaveTextContent('2:30 PM');
    });

    it('opens a dialog exposing three labelled listboxes with the seeded option selected', async () => {
        renderWithProviders(
            <WheelTimePicker value="09:00" onChange={() => {}} />
        );
        await userEvent.click(screen.getByRole('button'));
        const dialog = screen.getByRole('dialog', { name: 'Select time' });
        const hour = within(dialog).getByRole('listbox', { name: 'Hour' });
        expect(hour).toBeInTheDocument();
        expect(
            within(dialog).getByRole('listbox', { name: 'Minute' })
        ).toBeInTheDocument();
        expect(
            within(dialog).getByRole('listbox', { name: 'AM or PM' })
        ).toBeInTheDocument();
        // 09:00 seeds the hour wheel to "9" (aria-selected) + aria-activedescendant.
        expect(
            within(hour).getByRole('option', { name: '9' })
        ).toHaveAttribute('aria-selected', 'true');
        expect(hour).toHaveAttribute('aria-activedescendant');
    });

    it('moves the highlight with ArrowDown and commits the new time on Done', async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <WheelTimePicker value="09:00" onChange={onChange} />
        );
        await userEvent.click(screen.getByRole('button'));
        const hour = screen.getByRole('listbox', { name: 'Hour' });
        hour.focus();
        await userEvent.keyboard('{ArrowDown}');
        expect(
            within(hour).getByRole('option', { name: '10' })
        ).toHaveAttribute('aria-selected', 'true');
        await userEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(onChange).toHaveBeenCalledWith('10:00');
    });

    it('selects a minute by clicking its option and commits on Done', async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <WheelTimePicker value="09:00" onChange={onChange} />
        );
        await userEvent.click(screen.getByRole('button'));
        const minute = screen.getByRole('listbox', { name: 'Minute' });
        await userEvent.click(within(minute).getByRole('option', { name: '30' }));
        await userEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(onChange).toHaveBeenCalledWith('09:30');
    });

    it('does not open when disabled', async () => {
        renderWithProviders(
            <WheelTimePicker label="Depart" onChange={() => {}} disabled />
        );
        const trigger = screen.getByRole('button');
        expect(trigger).toBeDisabled();
        await userEvent.click(trigger);
        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        );
    });
});

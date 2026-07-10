import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from 'test/renderWithProviders';
import PhoneInput from './index';

// No data layer to mock — libphonenumber-js runs for real (as-you-type
// formatting + E.164). i18n comes from renderWithProviders.

describe('PhoneInput', () => {
    it('renders the label and defaults to the US dial code', () => {
        renderWithProviders(<PhoneInput value="" onChange={vi.fn()} />);
        expect(screen.getByLabelText('Phone')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Country: United States/ })
        ).toHaveTextContent('+1');
    });

    it('parses a stored E.164 value into country + national display', () => {
        renderWithProviders(
            <PhoneInput value="+15551234567" onChange={vi.fn()} />
        );
        expect(screen.getByLabelText('Phone')).toHaveValue('(555) 123-4567');
        expect(
            screen.getByRole('button', { name: /Country: United States/ })
        ).toBeInTheDocument();
    });

    it('emits an E.164 string as the user types the national number', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithProviders(<PhoneInput value="" onChange={onChange} />);
        await user.type(screen.getByLabelText('Phone'), '5551234567');
        expect(onChange).toHaveBeenLastCalledWith('+15551234567');
    });

    it('falls back to a raw +cc string for a too-short partial (unparseable)', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithProviders(<PhoneInput value="" onChange={onChange} />);
        await user.type(screen.getByLabelText('Phone'), '5');
        expect(onChange).toHaveBeenCalledWith('+15');
    });

    it('emits an empty string when the input is cleared', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithProviders(
            <PhoneInput value="+15551234567" onChange={onChange} />
        );
        await user.clear(screen.getByLabelText('Phone'));
        expect(onChange).toHaveBeenLastCalledWith('');
    });

    it('opens the country picker, filters by search, and switches country', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithProviders(
            <PhoneInput value="+15551234567" onChange={onChange} />
        );
        await user.click(
            screen.getByRole('button', { name: /Country: United States/ })
        );
        // Popover search + listbox appear. Both the search input and the
        // listbox carry the "Select a country" a11y label, so target the
        // input by its placeholder to stay unambiguous.
        const search = await screen.findByPlaceholderText('Search country');
        await user.type(search, 'mexico');
        expect(
            await screen.findByRole('button', { name: /Mexico/ })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /^France/ })
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Mexico/ }));
        // Switching country preserves the typed digits and rebuilds E.164.
        expect(onChange).toHaveBeenLastCalledWith('+525551234567');
        // Popover closes and the button reflects the new dial code.
        await waitFor(() =>
            expect(
                screen.queryByPlaceholderText('Search country')
            ).not.toBeInTheDocument()
        );
        expect(
            screen.getByRole('button', { name: /Country: Mexico/ })
        ).toHaveTextContent('+52');
    });

    it('shows an empty state when no country matches the search', async () => {
        const user = userEvent.setup();
        renderWithProviders(<PhoneInput value="" onChange={vi.fn()} />);
        await user.click(
            screen.getByRole('button', { name: /Country: United States/ })
        );
        await user.type(
            await screen.findByPlaceholderText('Search country'),
            'zzzzz'
        );
        expect(
            await screen.findByText(/No countries match/)
        ).toBeInTheDocument();
    });

    it('dismisses the country picker on Escape without changing anything', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithProviders(<PhoneInput value="" onChange={onChange} />);
        await user.click(
            screen.getByRole('button', { name: /Country: United States/ })
        );
        await screen.findByPlaceholderText('Search country');
        await user.keyboard('{Escape}');
        await waitFor(() =>
            expect(
                screen.queryByPlaceholderText('Search country')
            ).not.toBeInTheDocument()
        );
        // Dismissing the picker never touches the stored value.
        expect(onChange).not.toHaveBeenCalled();
    });

    it('re-syncs the display when the parent updates value externally', () => {
        const { rerender } = renderWithProviders(
            <PhoneInput value="" onChange={vi.fn()} />
        );
        expect(screen.getByLabelText('Phone')).toHaveValue('');
        rerender(<PhoneInput value="+15551234567" onChange={vi.fn()} />);
        expect(screen.getByLabelText('Phone')).toHaveValue('(555) 123-4567');
        // …and clears again when the parent resets to empty.
        rerender(<PhoneInput value="" onChange={vi.fn()} />);
        expect(screen.getByLabelText('Phone')).toHaveValue('');
    });

    it('treats an unparseable stored value as empty', () => {
        renderWithProviders(
            <PhoneInput value="not-a-phone" onChange={vi.fn()} />
        );
        expect(screen.getByLabelText('Phone')).toHaveValue('');
    });

    it('disables the input and the country button when disabled', () => {
        renderWithProviders(
            <PhoneInput value="" onChange={vi.fn()} disabled />
        );
        expect(screen.getByLabelText('Phone')).toBeDisabled();
        expect(
            screen.getByRole('button', { name: /Country: United States/ })
        ).toBeDisabled();
    });

    it('renders no label element when label is empty', () => {
        renderWithProviders(<PhoneInput value="" onChange={vi.fn()} label="" />);
        expect(screen.queryByText('Phone')).not.toBeInTheDocument();
        // The national input is still reachable by its tel role.
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
});

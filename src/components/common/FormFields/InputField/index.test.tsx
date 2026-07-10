import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import {
    renderWithProviders,
    screen,
} from 'test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import InputField from './index';

describe('InputField — outlined text/number', () => {
    it('renders a labeled text input', () => {
        renderWithProviders(<InputField name="fullname" label="Full name" />);
        expect(
            screen.getByRole('textbox', { name: 'Full name' })
        ).toBeInTheDocument();
    });

    it('derives the label from the field name when no label is given', () => {
        renderWithProviders(<InputField name="email" />);
        // name is capitalised: "email" -> "Email".
        expect(
            screen.getByRole('textbox', { name: 'Email' })
        ).toBeInTheDocument();
    });

    it('renders no floating label when an explicit empty label is passed', () => {
        renderWithProviders(<InputField name="operator" label="" />);
        const input = screen.getByRole('textbox');
        // Explicit empty label -> caller owns its own external label.
        expect(input).not.toHaveAccessibleName();
    });

    it('renders a number input as a spinbutton', () => {
        renderWithProviders(
            <InputField name="qty" label="Quantity" type="number" />
        );
        expect(
            screen.getByRole('spinbutton', { name: 'Quantity' })
        ).toBeInTheDocument();
    });

    it('fires onChange with the typed value (uncontrolled)', async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <InputField name="city" label="City" onChange={onChange} />
        );
        const input = screen.getByRole('textbox', { name: 'City' });
        await userEvent.type(input, 'Rome');
        expect(onChange).toHaveBeenCalled();
        expect(input).toHaveValue('Rome');
    });

    it('shows a controlled value and keeps it fixed while typing', async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <InputField
                name="city"
                label="City"
                value="Oslo"
                onChange={onChange}
            />
        );
        const input = screen.getByRole('textbox', { name: 'City' });
        expect(input).toHaveValue('Oslo');
        await userEvent.type(input, 'X');
        expect(onChange).toHaveBeenCalled();
        // Parent controls the value; the DOM value doesn't drift.
        expect(input).toHaveValue('Oslo');
    });

    it('hydrates from defaultValue', async () => {
        renderWithProviders(
            <InputField name="city" label="City" defaultValue="Berlin" />
        );
        expect(
            await screen.findByDisplayValue('Berlin')
        ).toBeInTheDocument();
    });

    it('is disabled when disabled is set', () => {
        renderWithProviders(
            <InputField name="city" label="City" disabled />
        );
        expect(screen.getByRole('textbox', { name: 'City' })).toBeDisabled();
    });

    it('forwards a ref to the underlying input', () => {
        const ref = createRef<HTMLInputElement>();
        renderWithProviders(
            <InputField name="city" label="City" ref={ref} />
        );
        expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('renders a top label when labelOnTop is set', () => {
        renderWithProviders(
            <InputField name="city" label="Where to?" labelOnTop />
        );
        // labelOnTop adds a stacked top label in addition to the floating
        // MUI InputLabel, so the text appears twice.
        expect(screen.getAllByText('Where to?')).toHaveLength(2);
    });
});

describe('InputField — file variant', () => {
    it('displays the picked file name on upload', async () => {
        const onChange = vi.fn();
        const { container } = renderWithProviders(
            <InputField name="doc" label="Doc" type="file" onChange={onChange} />
        );
        const input = container.querySelector(
            'input[type="file"]'
        ) as HTMLInputElement;
        const file = new File(['x'], 'photo.png', { type: 'image/png' });
        await userEvent.upload(input, file);
        expect(onChange).toHaveBeenCalled();
        expect(screen.getByText('photo.png')).toBeInTheDocument();
    });
});

describe('InputField — bare variant', () => {
    it('renders a labeled native input', () => {
        renderWithProviders(
            <InputField variant="bare" name="city" label="City" />
        );
        expect(
            screen.getByRole('textbox', { name: 'City' })
        ).toBeInTheDocument();
    });

    it('renders no label span when label is omitted', () => {
        renderWithProviders(
            <InputField variant="bare" name="city" placeholder="Type here" />
        );
        const input = screen.getByPlaceholderText('Type here');
        expect(input).toBeInTheDocument();
        expect(input).not.toHaveAccessibleName();
    });

    it('fires onChange while typing (uncontrolled)', async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <InputField
                variant="bare"
                name="city"
                label="City"
                onChange={onChange}
            />
        );
        const input = screen.getByRole('textbox', { name: 'City' });
        await userEvent.type(input, 'Kyoto');
        expect(onChange).toHaveBeenCalled();
        expect(input).toHaveValue('Kyoto');
    });

    it('respects a controlled value', () => {
        renderWithProviders(
            <InputField
                variant="bare"
                name="city"
                label="City"
                value="Cairo"
                onChange={() => {}}
            />
        );
        expect(screen.getByRole('textbox', { name: 'City' })).toHaveValue(
            'Cairo'
        );
    });

    it('is required by default and can be made optional', () => {
        const { rerender } = renderWithProviders(
            <InputField variant="bare" name="city" label="City" />
        );
        expect(screen.getByRole('textbox', { name: 'City' })).toBeRequired();
        rerender(
            <InputField
                variant="bare"
                name="city"
                label="City"
                required={false}
            />
        );
        expect(screen.getByRole('textbox', { name: 'City' })).not.toBeRequired();
    });

    it('is disabled when disabled is set', () => {
        renderWithProviders(
            <InputField variant="bare" name="city" label="City" disabled />
        );
        expect(screen.getByRole('textbox', { name: 'City' })).toBeDisabled();
    });
});

describe('InputField — date / time pickers (desktop)', () => {
    // jsdom's matchMedia stub reports `matches: false`, so `useMediaQuery`
    // resolves to the DESKTOP branch — the MUI DatePicker / TimePicker.
    it('renders a date picker with a top label (uncontrolled default)', () => {
        const { container } = renderWithProviders(
            <InputField name="depart" label="Depart" type="date" />
        );
        expect(screen.getByText('Depart')).toBeInTheDocument();
        expect(container.querySelector('input')).toBeInTheDocument();
    });

    it('renders a date picker from a controlled value', () => {
        const { container } = renderWithProviders(
            <InputField
                name="depart"
                label="Depart"
                type="date"
                value="2026-01-15"
            />
        );
        expect(container.querySelector('input')).toBeInTheDocument();
    });

    it('handles an empty controlled date value', () => {
        const { container } = renderWithProviders(
            <InputField name="depart" label="Depart" type="date" value="" />
        );
        expect(container.querySelector('input')).toBeInTheDocument();
    });

    it('respects min/max date bounds', () => {
        const { container } = renderWithProviders(
            <InputField
                name="depart"
                label="Depart"
                type="date"
                minDate="2026-01-01"
                maxDate="2026-12-31"
                value="2026-06-15"
            />
        );
        expect(container.querySelector('input')).toBeInTheDocument();
    });

    it('renders a time picker (uncontrolled default)', () => {
        const { container } = renderWithProviders(
            <InputField name="pickup" label="Pickup" type="time" />
        );
        expect(container.querySelector('input')).toBeInTheDocument();
    });

    it('renders a time picker from a controlled value', () => {
        const { container } = renderWithProviders(
            <InputField
                name="pickup"
                label="Pickup"
                type="time"
                value="09:30"
            />
        );
        expect(container.querySelector('input')).toBeInTheDocument();
    });

    it('renders a time picker with a top label', () => {
        const { container } = renderWithProviders(
            <InputField
                name="pickup"
                label="Pickup"
                type="time"
                labelOnTop
                defaultValue="09:30"
            />
        );
        expect(container.querySelector('input')).toBeInTheDocument();
    });
});

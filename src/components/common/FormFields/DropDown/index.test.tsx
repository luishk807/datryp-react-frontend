import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DropdownCustom, { type DropdownOption } from './index';

const OPTIONS: DropdownOption[] = [
    { id: 1, name: 'Paris' },
    { id: 2, name: 'Tokyo' },
    { id: 3, name: 'Lima' },
];

describe('DropdownCustom — bare variant (native select)', () => {
    it('renders a labeled native select with all options', () => {
        render(
            <DropdownCustom variant="bare" label="City" options={OPTIONS} />
        );
        const select = screen.getByRole('combobox', { name: 'City' });
        expect(select).toBeInTheDocument();
        expect(within(select).getAllByRole('option')).toHaveLength(3);
    });

    it('renders a leading placeholder option when placeholder is set', () => {
        render(
            <DropdownCustom
                variant="bare"
                label="City"
                options={OPTIONS}
                placeholder="Choose a city"
            />
        );
        const select = screen.getByRole('combobox', { name: 'City' });
        expect(within(select).getAllByRole('option')).toHaveLength(4);
        expect(
            within(select).getByRole('option', { name: 'Choose a city' })
        ).toBeInTheDocument();
    });

    it('calls onChange with the selected option object', async () => {
        const onChange = vi.fn();
        render(
            <DropdownCustom
                variant="bare"
                label="City"
                options={OPTIONS}
                onChange={onChange}
            />
        );
        await userEvent.selectOptions(
            screen.getByRole('combobox', { name: 'City' }),
            'Tokyo'
        );
        expect(onChange).toHaveBeenCalledWith(OPTIONS[1]);
    });

    it('calls onChange with undefined when the placeholder is re-selected', async () => {
        const onChange = vi.fn();
        render(
            <DropdownCustom
                variant="bare"
                label="City"
                options={OPTIONS}
                placeholder="Choose a city"
                defaultValue={OPTIONS[0]}
                onChange={onChange}
            />
        );
        const select = screen.getByRole('combobox', { name: 'City' });
        await userEvent.selectOptions(select, '');
        expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('reflects an uncontrolled defaultValue selection', () => {
        render(
            <DropdownCustom
                variant="bare"
                label="City"
                options={OPTIONS}
                defaultValue={OPTIONS[2]}
            />
        );
        expect(screen.getByRole('combobox', { name: 'City' })).toHaveValue('3');
    });

    it('honours a controlled value and does not self-update on change', async () => {
        const onChange = vi.fn();
        render(
            <DropdownCustom
                variant="bare"
                label="City"
                options={OPTIONS}
                value={1}
                onChange={onChange}
            />
        );
        const select = screen.getByRole('combobox', { name: 'City' });
        expect(select).toHaveValue('1');
        await userEvent.selectOptions(select, 'Lima');
        expect(onChange).toHaveBeenCalledWith(OPTIONS[2]);
        // Controlled: value prop still drives the display.
        expect(select).toHaveValue('1');
    });

    it('keys options by a custom valueKey', () => {
        render(
            <DropdownCustom
                variant="bare"
                label="City"
                options={OPTIONS}
                valueKey="name"
                defaultValue={OPTIONS[0]}
            />
        );
        expect(screen.getByRole('combobox', { name: 'City' })).toHaveValue(
            'Paris'
        );
    });

    it('is disabled when disabled is set', () => {
        render(
            <DropdownCustom
                variant="bare"
                label="City"
                options={OPTIONS}
                disabled
            />
        );
        expect(screen.getByRole('combobox', { name: 'City' })).toBeDisabled();
    });
});

describe('DropdownCustom — outlined variant (MUI select)', () => {
    it('renders a combobox and opens a listbox of options on click', async () => {
        render(<DropdownCustom label="City" options={OPTIONS} />);
        const combo = screen.getByRole('combobox');
        await userEvent.click(combo);
        const listbox = screen.getByRole('listbox');
        expect(within(listbox).getAllByRole('option')).toHaveLength(3);
    });

    it('calls onChange with the chosen option object', async () => {
        const onChange = vi.fn();
        render(
            <DropdownCustom label="City" options={OPTIONS} onChange={onChange} />
        );
        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(
            within(screen.getByRole('listbox')).getByRole('option', {
                name: 'Paris',
            })
        );
        expect(onChange).toHaveBeenCalledWith(OPTIONS[0]);
    });

    it('renders a placeholder MenuItem in the empty state', async () => {
        render(
            <DropdownCustom
                label="City"
                options={OPTIONS}
                placeholder="Pick one"
            />
        );
        await userEvent.click(screen.getByRole('combobox'));
        const listbox = screen.getByRole('listbox');
        expect(
            within(listbox).getByRole('option', { name: 'Pick one' })
        ).toBeInTheDocument();
        // placeholder + 3 real options.
        expect(within(listbox).getAllByRole('option')).toHaveLength(4);
    });

    it('shows a controlled value selection', () => {
        render(
            <DropdownCustom label="City" options={OPTIONS} value={2} />
        );
        // MUI renders the selected option's label in the combobox.
        expect(screen.getByRole('combobox')).toHaveTextContent('Tokyo');
    });

    it('disables the control when disabled', () => {
        render(<DropdownCustom label="City" options={OPTIONS} disabled />);
        expect(screen.getByRole('combobox')).toHaveAttribute(
            'aria-disabled',
            'true'
        );
    });

    it('renders with no options without crashing', () => {
        render(<DropdownCustom label="Empty" />);
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
});

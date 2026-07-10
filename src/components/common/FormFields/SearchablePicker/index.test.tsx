import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchablePicker, {
    type SearchablePickerOption,
} from './index';

const OPTIONS: SearchablePickerOption[] = [
    { value: 'paris', label: 'Paris' },
    { value: 'tokyo', label: 'Tokyo' },
    { value: 'lima', label: 'Lima' },
    { value: 'oslo', label: 'Oslo' },
];

describe('SearchablePicker', () => {
    it('renders the label, a search box and one pill per option', () => {
        render(
            <SearchablePicker
                label="Interests"
                options={OPTIONS}
                value={[]}
                onChange={() => {}}
            />
        );
        expect(
            screen.getByRole('textbox', { name: 'Interests' })
        ).toBeInTheDocument();
        expect(
            within(screen.getByRole('listbox')).getAllByRole('option')
        ).toHaveLength(4);
    });

    it('marks selected options with aria-selected', () => {
        render(
            <SearchablePicker
                label="Interests"
                options={OPTIONS}
                value={['tokyo']}
                onChange={() => {}}
            />
        );
        expect(
            screen.getByRole('option', { name: 'Tokyo' })
        ).toHaveAttribute('aria-selected', 'true');
        expect(
            screen.getByRole('option', { name: 'Paris' })
        ).toHaveAttribute('aria-selected', 'false');
    });

    it('adds a value when an unselected pill is clicked', async () => {
        const onChange = vi.fn();
        render(
            <SearchablePicker
                label="Interests"
                options={OPTIONS}
                value={['paris']}
                onChange={onChange}
            />
        );
        await userEvent.click(screen.getByRole('option', { name: 'Tokyo' }));
        expect(onChange).toHaveBeenCalledWith(['paris', 'tokyo']);
    });

    it('removes a value when a selected pill is clicked', async () => {
        const onChange = vi.fn();
        render(
            <SearchablePicker
                label="Interests"
                options={OPTIONS}
                value={['paris', 'tokyo']}
                onChange={onChange}
            />
        );
        await userEvent.click(screen.getByRole('option', { name: 'Paris' }));
        expect(onChange).toHaveBeenCalledWith(['tokyo']);
    });

    it('filters the pills as the user types', async () => {
        render(
            <SearchablePicker
                label="Interests"
                options={OPTIONS}
                value={[]}
                onChange={() => {}}
            />
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Interests' }),
            'to'
        );
        const options = within(screen.getByRole('listbox')).getAllByRole(
            'option'
        );
        expect(options).toHaveLength(1);
        expect(options[0]).toHaveTextContent('Tokyo');
    });

    it('shows the empty text when the filter matches nothing', async () => {
        render(
            <SearchablePicker
                label="Interests"
                options={OPTIONS}
                value={[]}
                onChange={() => {}}
                emptyText="Nothing here"
            />
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Interests' }),
            'zzzz'
        );
        expect(screen.getByText('Nothing here')).toBeInTheDocument();
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('adds the first unselected match and clears the box on Enter', async () => {
        const onChange = vi.fn();
        render(
            <SearchablePicker
                label="Interests"
                options={OPTIONS}
                value={[]}
                onChange={onChange}
            />
        );
        const box = screen.getByRole('textbox', { name: 'Interests' });
        await userEvent.type(box, 'lima{Enter}');
        expect(onChange).toHaveBeenCalledWith(['lima']);
        // Input clears itself so the user can keep adding.
        expect(box).toHaveValue('');
    });

    it('ignores Enter when the query matches nothing', async () => {
        const onChange = vi.fn();
        render(
            <SearchablePicker
                label="Interests"
                options={OPTIONS}
                value={[]}
                onChange={onChange}
            />
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Interests' }),
            'zzzz{Enter}'
        );
        expect(onChange).not.toHaveBeenCalled();
    });

    it('ignores Enter on an empty query', async () => {
        const onChange = vi.fn();
        render(
            <SearchablePicker
                label="Interests"
                options={OPTIONS}
                value={[]}
                onChange={onChange}
            />
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Interests' }),
            '{Enter}'
        );
        expect(onChange).not.toHaveBeenCalled();
    });

    it('locks out unselected pills once the selection cap is reached', async () => {
        const onChange = vi.fn();
        render(
            <SearchablePicker
                label="Interests"
                options={OPTIONS}
                value={['paris']}
                onChange={onChange}
                maxSelected={1}
            />
        );
        const tokyo = screen.getByRole('option', { name: 'Tokyo' });
        expect(tokyo).toBeDisabled();
        await userEvent.click(tokyo);
        expect(onChange).not.toHaveBeenCalled();
        // The already-selected pill can still be removed.
        await userEvent.click(screen.getByRole('option', { name: 'Paris' }));
        expect(onChange).toHaveBeenCalledWith([]);
    });

    it('does not add past the cap via Enter', async () => {
        const onChange = vi.fn();
        render(
            <SearchablePicker
                label="Interests"
                options={OPTIONS}
                value={['paris']}
                onChange={onChange}
                maxSelected={1}
            />
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Interests' }),
            'tokyo{Enter}'
        );
        expect(onChange).not.toHaveBeenCalled();
    });

    it('is fully disabled when disabled is set', async () => {
        const onChange = vi.fn();
        render(
            <SearchablePicker
                label="Interests"
                options={OPTIONS}
                value={[]}
                onChange={onChange}
                disabled
            />
        );
        expect(
            screen.getByRole('textbox', { name: 'Interests' })
        ).toBeDisabled();
        const tokyo = screen.getByRole('option', { name: 'Tokyo' });
        expect(tokyo).toBeDisabled();
        await userEvent.click(tokyo);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('renders helper text when provided', () => {
        render(
            <SearchablePicker
                label="Interests"
                options={OPTIONS}
                value={[]}
                onChange={() => {}}
                helperText="Pick up to five"
            />
        );
        expect(screen.getByText('Pick up to five')).toBeInTheDocument();
    });
});

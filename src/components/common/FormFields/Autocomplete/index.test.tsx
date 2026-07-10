import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from 'test/renderWithProviders';
import AutocompleteCustom, { type AutocompleteOption } from './index';

const OPTIONS: AutocompleteOption[] = [
    { id: 1, label: 'Alice' },
    { id: 2, label: 'Bob' },
];

// Stable empty reference for the "nothing selected" case. The component syncs
// `selectedOptions` into internal state via `useEffect(..., [selectedOptions])`;
// a fresh array each render would re-fire it. The component now defaults the
// prop to a stable module ref internally (so omitting it is safe too — see the
// regression test below), but passing this shared constant keeps intent clear.
const NO_SELECTION: AutocompleteOption[] = [];

/** Options list mirroring FriendPicker's shape: real people plus the
 *  "-1" add-sentinel row that opens the invite modal. */
const OPTIONS_WITH_SENTINEL: AutocompleteOption[] = [
    { id: 1, label: 'Alice' },
    { id: 2, label: 'Bob' },
    { id: -1, label: 'Invite a friend' },
];

describe('AutocompleteCustom', () => {
    it('renders the field with its label (single-select default)', () => {
        renderWithProviders(
            <AutocompleteCustom
                label="Friends"
                options={OPTIONS}
                selectedOptions={NO_SELECTION}
            />
        );
        // The MUI TextField label is wired to the combobox input.
        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(screen.getByLabelText('Friends')).toBeInTheDocument();
    });

    it('renders without a selectedOptions prop (no infinite render loop)', () => {
        // Regression: the default selectedOptions used to be a fresh `[]` each
        // render, which spun the sync effect into "Maximum update depth
        // exceeded". A stable module-level default fixes it — omitting the
        // prop must render cleanly.
        expect(() =>
            renderWithProviders(
                <AutocompleteCustom label="Friends" options={OPTIONS} isMultiple />
            )
        ).not.toThrow();
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('opens the listbox and renders every option', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AutocompleteCustom
                label="Friends"
                options={OPTIONS}
                isMultiple
                selectedOptions={NO_SELECTION}
            />
        );
        await user.click(screen.getByRole('combobox'));
        expect(
            await screen.findByRole('option', { name: 'Alice' })
        ).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Bob' })).toBeInTheDocument();
    });

    it('fires onSelect with the clicked option', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        renderWithProviders(
            <AutocompleteCustom
                label="Friends"
                options={OPTIONS}
                isMultiple
                selectedOptions={NO_SELECTION}
                onSelect={onSelect}
            />
        );
        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByRole('option', { name: 'Bob' }));
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith({ id: 2, label: 'Bob' });
    });

    it('selects an option via keyboard (ArrowDown + Enter)', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        renderWithProviders(
            <AutocompleteCustom
                label="Friends"
                options={OPTIONS}
                isMultiple
                selectedOptions={NO_SELECTION}
                onSelect={onSelect}
            />
        );
        const input = screen.getByRole('combobox');
        await user.click(input);
        await screen.findByRole('option', { name: 'Alice' });
        // Options are not focusable elements — the a11y fix keeps focus on the
        // input and drives the highlight via aria-activedescendant, so Arrow +
        // Enter must select without ever touching the <li>.
        await user.keyboard('{ArrowDown}{Enter}');
        expect(onSelect).toHaveBeenCalledWith({ id: 1, label: 'Alice' });
    });

    it('fires onSelect for the -1 add sentinel option and renders its divider', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        renderWithProviders(
            <AutocompleteCustom
                label="Friends"
                options={OPTIONS_WITH_SENTINEL}
                isMultiple
                selectedOptions={NO_SELECTION}
                onSelect={onSelect}
            />
        );
        await user.click(screen.getByRole('combobox'));
        const sentinel = await screen.findByRole('option', {
            name: 'Invite a friend',
        });
        // Default sentinel branch draws an <hr> separator above the label.
        expect(document.querySelector('.autocomplete-custom-option')).toHaveTextContent(
            'Invite a friend'
        );
        expect(sentinel.querySelector('hr')).toBeInTheDocument();
        await user.click(sentinel);
        expect(onSelect).toHaveBeenCalledWith({ id: -1, label: 'Invite a friend' });
    });

    it('uses a custom renderOption and marks already-selected rows disabled', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AutocompleteCustom
                label="Friends"
                options={OPTIONS_WITH_SENTINEL}
                selectedOptions={[{ id: 1, label: 'Alice' }]}
                isMultiple
                renderOption={(option, isSelected) => (
                    <span>
                        {option.label}
                        {isSelected ? ' (added)' : ''}
                    </span>
                )}
            />
        );
        await user.click(screen.getByRole('combobox'));
        const alice = await screen.findByRole('option', { name: /Alice/ });
        // renderOption received isSelected=true for the pre-selected row…
        expect(alice).toHaveTextContent('Alice (added)');
        // …and the wrapper li carries both marker classes.
        expect(alice).toHaveClass('autocomplete-custom-li');
        expect(alice).toHaveClass('disabled');
        // The -1 sentinel is never treated as "disabled/selected".
        const sentinel = screen.getByRole('option', { name: /Invite a friend/ });
        expect(sentinel).not.toHaveClass('disabled');
    });

    it('marks an already-selected row disabled in the default (no renderOption) branch', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AutocompleteCustom
                label="Friends"
                options={OPTIONS}
                selectedOptions={[{ id: 2, label: 'Bob' }]}
                isMultiple
            />
        );
        await user.click(screen.getByRole('combobox'));
        const bob = await screen.findByRole('option', { name: 'Bob' });
        expect(bob).toHaveClass('disabled');
        expect(screen.getByRole('option', { name: 'Alice' })).not.toHaveClass(
            'disabled'
        );
    });

    it('fires onRemove with the removed options when the selection is cleared', async () => {
        const user = userEvent.setup();
        const onRemove = vi.fn();
        const onSelect = vi.fn();
        renderWithProviders(
            <AutocompleteCustom
                label="Friends"
                options={OPTIONS}
                selectedOptions={[{ id: 1, label: 'Alice' }]}
                isMultiple
                onRemove={onRemove}
                onSelect={onSelect}
            />
        );
        // Clearing the whole selection reports Alice as the removed option
        // (contract: onRemove receives the items that LEFT, not the survivors).
        await user.click(screen.getByLabelText('Clear'));
        expect(onRemove).toHaveBeenCalledWith([{ id: 1, label: 'Alice' }]);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('removes a single chip and reports just that option to onRemove', async () => {
        const user = userEvent.setup();
        const onRemove = vi.fn();
        renderWithProviders(
            <AutocompleteCustom
                label="Friends"
                options={OPTIONS}
                selectedOptions={[
                    { id: 1, label: 'Alice' },
                    { id: 2, label: 'Bob' },
                ]}
                isMultiple
                onRemove={onRemove}
            />
        );
        // Focus the (empty) input and Backspace removes the last chip (Bob).
        await user.click(screen.getByRole('combobox'));
        await user.keyboard('{Backspace}');
        expect(onRemove).toHaveBeenCalledWith([{ id: 2, label: 'Bob' }]);
    });
});

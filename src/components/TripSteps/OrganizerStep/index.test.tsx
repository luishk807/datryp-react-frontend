import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { Friend, TripState } from 'types';

// FriendPicker pulls in useFriends (network) + useUser + the invite modal;
// stub it to a readout of the props the step wires + a button that fires the
// picker's onChange, so the step's own handler contract is what's tested.
interface PickerStubProps {
    title?: string;
    ariaLabel?: string;
    name?: string;
    selectedOptions?: Friend[];
    onChange: (
        name: string | undefined,
        e: { target: { value: Friend[] } }
    ) => void;
}
const ADDED: Friend = { id: 9, name: 'Bob', userId: 'u9' };
vi.mock('components/DestinationDetail/FriendPicker', () => ({
    default: ({
        title,
        ariaLabel,
        name,
        selectedOptions,
        onChange,
    }: PickerStubProps) => (
        <div data-testid="friend-picker">
            <span data-testid="fp-title">{title}</span>
            <span data-testid="fp-arialabel" data-value={ariaLabel} />
            <span data-testid="fp-name">{name}</span>
            <span data-testid="fp-count">{selectedOptions?.length ?? 0}</span>
            <button
                type="button"
                onClick={() => onChange(name, { target: { value: [ADDED] } })}
            >
                add-friend
            </button>
        </div>
    ),
}));

import OrganizerStep from './index';

const trip = (over: Partial<TripState> = {}): TripState => ({
    destinations: [],
    ...over,
});

describe('OrganizerStep', () => {
    it('renders the headline, label, and the picker seeded with organizers', () => {
        renderWithProviders(
            <OrganizerStep
                data={trip({
                    organizer: [{ id: 1, name: 'Me', userId: 'u1' }],
                })}
                onChange={vi.fn()}
            />
        );
        expect(
            screen.getByRole('heading', { name: /who's organizing/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Organizers')).toBeInTheDocument();
        // The picker's combobox gets the section label as its accessible name.
        expect(screen.getByTestId('fp-arialabel')).toHaveAttribute(
            'data-value',
            'Organizers'
        );
        expect(screen.getByTestId('fp-name')).toHaveTextContent('organizer');
        expect(screen.getByTestId('fp-count')).toHaveTextContent('1');
    });

    it('forwards a picker change as an "organizer" field change', async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <OrganizerStep data={trip()} onChange={onChange} />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'add-friend' })
        );
        expect(onChange).toHaveBeenCalledWith('organizer', {
            target: { value: [ADDED] },
        });
    });
});

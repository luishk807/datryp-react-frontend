import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { Friend, TripState } from 'types';

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

import ParticipantStep from './index';

const trip = (over: Partial<TripState> = {}): TripState => ({
    destinations: [],
    ...over,
});

describe('ParticipantStep', () => {
    it('renders the headline, label, and the picker seeded with friends', () => {
        renderWithProviders(
            <ParticipantStep
                data={trip({ friends: [{ id: 1, name: 'Me', userId: 'u1' }] })}
                onChange={vi.fn()}
            />
        );
        expect(
            screen.getByRole('heading', { name: /who's coming along/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Participants')).toBeInTheDocument();
        // The picker's combobox gets the section label as its accessible name.
        expect(screen.getByTestId('fp-arialabel')).toHaveAttribute(
            'data-value',
            'Participants'
        );
        expect(screen.getByTestId('fp-name')).toHaveTextContent('friends');
        expect(screen.getByTestId('fp-count')).toHaveTextContent('1');
    });

    it('forwards a picker change as a "friends" field change', async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <ParticipantStep data={trip()} onChange={onChange} />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'add-friend' })
        );
        expect(onChange).toHaveBeenCalledWith('friends', {
            target: { value: [ADDED] },
        });
    });
});

import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    act,
    fireEvent,
    waitFor,
} from '../../test/renderWithProviders';
import type { ModalButtonHandle } from 'components/ModalButton';
import type { TripState } from 'types';

// The MUI desktop DatePicker is awkward to drive; swap InputField for a
// native input so the test can set the new start date directly and exercise
// the shift preview + submit path.
vi.mock('components/common/FormFields/InputField', () => ({
    default: ({
        label,
        name,
        value,
        onChange,
        type = 'text',
        disabled,
    }: {
        label?: string | null;
        name?: string;
        value?: string;
        onChange?: (e: { target: { value: string } }) => void;
        type?: string;
        disabled?: boolean;
    }) => (
        <input
            aria-label={typeof label === 'string' && label ? label : name}
            name={name}
            type={type}
            disabled={disabled}
            value={value ?? ''}
            onChange={(e) => onChange?.({ target: { value: e.target.value } })}
        />
    ),
}));

import ShiftDatesModal from './index';

const tripData: TripState = {
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    destinations: [
        {
            id: 1,
            country: { id: 1, name: 'Japan' },
            itinerary: [
                {
                    date: '2026-08-01',
                    activities: [{ id: 1, name: 'Museum', kind: 'place' }],
                } as never,
                {
                    date: '2026-08-02',
                    activities: [
                        {
                            id: 2,
                            name: 'Flight',
                            kind: 'flight',
                            flightSegments: [{ departDate: '2026-08-02' }],
                        },
                    ],
                } as never,
            ],
        },
    ],
};

const open = (over: Partial<Parameters<typeof ShiftDatesModal>[0]> = {}) => {
    const ref = createRef<ModalButtonHandle>();
    const onShift = vi.fn().mockResolvedValue(true);
    renderWithProviders(
        <ShiftDatesModal
            ref={ref}
            data={tripData}
            isSaving={false}
            onShift={onShift}
            {...over}
        />
    );
    act(() => ref.current?.openModel());
    return { ref, onShift };
};

beforeEach(() => vi.clearAllMocks());

describe('ShiftDatesModal', () => {
    it('renders no content until opened via its ref', () => {
        const ref = createRef<ModalButtonHandle>();
        renderWithProviders(
            <ShiftDatesModal
                ref={ref}
                data={tripData}
                isSaving={false}
                onShift={vi.fn().mockResolvedValue(true)}
            />
        );
        expect(
            screen.queryByRole('heading', { name: 'Shift trip dates' })
        ).not.toBeInTheDocument();
    });

    it('opens on the current start with the shift button disabled (no delta yet)', () => {
        open();
        expect(
            screen.getByRole('heading', { name: 'Shift trip dates' })
        ).toBeInTheDocument();
        expect(screen.getByText(/Keeping your 3-day trip/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Shift dates' })).toBeDisabled();
    });

    it('previews the shift impact once a new start date is chosen', async () => {
        open();
        fireEvent.change(screen.getByLabelText('New start date'), {
            target: { value: '2026-08-10' },
        });
        expect(
            screen.getByText('1 activity moves automatically')
        ).toBeInTheDocument();
        expect(
            screen.getByText('1 booking needs rescheduling')
        ).toBeInTheDocument();
        expect(screen.getByText('Flight')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Shift dates' })).toBeEnabled();
    });

    it('shifts with the chosen date and closes on success', async () => {
        const { onShift } = open();
        fireEvent.change(screen.getByLabelText('New start date'), {
            target: { value: '2026-08-10' },
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Shift dates' })
        );
        expect(onShift).toHaveBeenCalledWith('2026-08-10');
        await waitFor(() =>
            expect(
                screen.queryByRole('heading', { name: 'Shift trip dates' })
            ).not.toBeInTheDocument()
        );
    });

    it('surfaces a save error inline', () => {
        open({ saveError: 'Could not shift' });
        expect(screen.getByRole('alert')).toHaveTextContent('Could not shift');
    });
});

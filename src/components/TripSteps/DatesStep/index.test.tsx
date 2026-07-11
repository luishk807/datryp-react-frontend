import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { TripState } from 'types';
import DatesStep from './index';

const trip = (over: Partial<TripState> = {}): TripState => ({
    destinations: [],
    ...over,
});

describe('DatesStep', () => {
    it('renders the headline and both date labels', () => {
        renderWithProviders(<DatesStep data={trip()} onChange={vi.fn()} />);
        expect(
            screen.getByRole('heading', { name: /when are you going/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Starts')).toBeInTheDocument();
        expect(screen.getByText('Ends')).toBeInTheDocument();
    });

    it('summarizes the number of nights for a valid range', () => {
        renderWithProviders(
            <DatesStep
                data={trip({ startDate: '2026-08-01', endDate: '2026-08-05' })}
                onChange={vi.fn()}
            />
        );
        expect(
            screen.getByText('4 nights on the road.')
        ).toBeInTheDocument();
    });

    it('labels a same-day range as a day trip', () => {
        renderWithProviders(
            <DatesStep
                data={trip({ startDate: '2026-08-01', endDate: '2026-08-01' })}
                onChange={vi.fn()}
            />
        );
        expect(screen.getByText('Day trip.')).toBeInTheDocument();
    });

    it('flags a backwards range with an alert and no nights summary', () => {
        renderWithProviders(
            <DatesStep
                data={trip({ startDate: '2026-08-10', endDate: '2026-08-01' })}
                onChange={vi.fn()}
            />
        );
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent(
            /end date can't be before the start date/i
        );
        expect(
            screen.queryByText(/on the road/i)
        ).not.toBeInTheDocument();
    });

    it('shows no summary or alert when a date is missing', () => {
        renderWithProviders(
            <DatesStep
                data={trip({ startDate: '2026-08-01' })}
                onChange={vi.fn()}
            />
        );
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.queryByText(/on the road/i)).not.toBeInTheDocument();
        expect(screen.queryByText('Day trip.')).not.toBeInTheDocument();
    });
});

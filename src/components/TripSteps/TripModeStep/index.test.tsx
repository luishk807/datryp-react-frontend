import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import { TripProvider, useTripState } from 'context/TripContext';
import type { TripState } from 'types';

const mockAdvance = vi.fn();
const mockNavigate = vi.fn();

// Only the imperative advance hook is used from StepperComp — stub the module
// to that so the heavy wizard tree isn't pulled in.
vi.mock('components/common/StepperComp', () => ({
    useStepperAdvance: () => ({ onAdvance: mockAdvance }),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

import TripModeStep from './index';

// Feed the step live trip state so a mode pick's `is-selected` styling shows.
const Harness = () => {
    const trip = useTripState();
    return <TripModeStep data={trip} />;
};

beforeEach(() => {
    localStorage.clear();
    mockAdvance.mockReset();
    mockNavigate.mockReset();
});

describe('TripModeStep', () => {
    it('renders the mode question as a radiogroup with two radios + an AI button', () => {
        renderWithProviders(
            <TripProvider>
                <Harness />
            </TripProvider>
        );
        expect(
            screen.getByRole('heading', { name: /what kind of trip/i })
        ).toBeInTheDocument();
        // The two mutually-exclusive choices are radios inside a radiogroup.
        expect(
            screen.getByRole('radiogroup', { name: /what kind of trip/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: /one destination/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: /multiple destinations/i })
        ).toBeInTheDocument();
        // The AI hand-off is a separate path, not a radio option.
        expect(
            screen.getByRole('button', { name: /let us plan it for you/i })
        ).toBeInTheDocument();
    });

    it('selects single mode and advances the wizard', async () => {
        renderWithProviders(
            <TripProvider>
                <Harness />
            </TripProvider>
        );
        await userEvent.click(
            screen.getByRole('radio', { name: /one destination/i })
        );
        expect(mockAdvance).toHaveBeenCalledTimes(1);
        const single = screen.getByRole('radio', { name: /one destination/i });
        expect(single).toHaveClass('is-selected');
        expect(single).toHaveAttribute('aria-checked', 'true');
    });

    it('selects multiple mode and advances the wizard', async () => {
        renderWithProviders(
            <TripProvider>
                <Harness />
            </TripProvider>
        );
        await userEvent.click(
            screen.getByRole('radio', { name: /multiple destinations/i })
        );
        expect(mockAdvance).toHaveBeenCalledTimes(1);
        expect(
            screen.getByRole('radio', { name: /multiple destinations/i })
        ).toHaveClass('is-selected');
    });

    it('arrow keys move + select between radios WITHOUT advancing', async () => {
        renderWithProviders(
            <TripProvider>
                <Harness />
            </TripProvider>
        );
        const single = screen.getByRole('radio', { name: /one destination/i });
        single.focus();
        // ArrowRight moves to (and selects) "Multiple" but must not advance.
        await userEvent.keyboard('{ArrowRight}');
        const multi = screen.getByRole('radio', {
            name: /multiple destinations/i,
        });
        expect(multi).toHaveAttribute('aria-checked', 'true');
        expect(multi).toHaveFocus();
        expect(mockAdvance).not.toHaveBeenCalled();
        // Enter on the focused radio commits the choice and advances.
        await userEvent.keyboard('{Enter}');
        expect(mockAdvance).toHaveBeenCalledTimes(1);
    });

    it('routes the AI card to /discover with no place hint by default', async () => {
        renderWithProviders(
            <TripProvider>
                <Harness />
            </TripProvider>
        );
        await userEvent.click(
            screen.getByRole('button', { name: /let us plan it for you/i })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/discover', {
            state: undefined,
        });
        expect(mockAdvance).not.toHaveBeenCalled();
    });

    it('names the destination on the AI card and locks it into /discover state', async () => {
        const withPlace: TripState = {
            destinations: [
                { id: 1, country: { id: 1, name: 'Iceland' }, itinerary: [] },
            ],
        };
        renderWithProviders(
            <TripProvider>
                <TripModeStep data={withPlace} />
            </TripProvider>
        );
        await userEvent.click(
            screen.getByRole('button', {
                name: /let us plan your trip to iceland/i,
            })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/discover', {
            state: { countryHint: 'Iceland', lockDestination: true },
        });
    });
});

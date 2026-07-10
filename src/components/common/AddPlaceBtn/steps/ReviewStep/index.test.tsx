import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../../test/renderWithProviders';
import { ACTIVITY_KIND } from 'constants';
import type { PlaceDraft } from '../../types';
import ReviewStep from './index';

// A text matcher that only hits the leaf span holding a value — used for
// strings with special glyphs (→ / en-dash) that also appear inside their
// ancestor's textContent.
const leaf =
    (...tokens: string[]) =>
    (content: string, el: Element | null) =>
        !!el &&
        el.children.length === 0 &&
        tokens.every((tk) => content.includes(tk));

describe('ReviewStep', () => {
    it('renders a place summary: name, kind, location, time, cost', () => {
        const place: PlaceDraft = {
            kind: ACTIVITY_KIND.PLACE,
            location: 'Paris, France',
            cost: '50',
            startTime: '10:00',
            endTime: '12:00',
        };
        renderWithProviders(
            <ReviewStep place={place} derivedName="Louvre" />
        );
        expect(screen.getByText('Ready to add?')).toBeInTheDocument();
        expect(screen.getByText('Louvre')).toBeInTheDocument();
        expect(screen.getByText('Place')).toBeInTheDocument();
        expect(screen.getByText('Paris, France')).toBeInTheDocument();
        expect(screen.getByText(leaf('10:00', '12:00'))).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('falls back to an "Untitled activity" name when derivedName is empty', () => {
        renderWithProviders(
            <ReviewStep
                place={{ kind: ACTIVITY_KIND.PLACE }}
                derivedName=""
            />
        );
        expect(
            screen.getByText('Untitled activity')
        ).toBeInTheDocument();
    });

    it('shows the resolving cue and spinner while still finishing up', () => {
        renderWithProviders(
            <ReviewStep
                place={{ kind: ACTIVITY_KIND.PLACE }}
                derivedName="Louvre"
                resolving
            />
        );
        expect(
            screen.getByText('Still finishing up the details…')
        ).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders an Edit affordance that fires onEdit', async () => {
        const onEdit = vi.fn();
        renderWithProviders(
            <ReviewStep
                place={{ kind: ACTIVITY_KIND.PLACE }}
                derivedName="Louvre"
                onEdit={onEdit}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: /Edit/ }));
        expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('omits the Edit affordance when onEdit is not provided', () => {
        renderWithProviders(
            <ReviewStep
                place={{ kind: ACTIVITY_KIND.PLACE }}
                derivedName="Louvre"
            />
        );
        expect(
            screen.queryByRole('button', { name: /Edit/ })
        ).not.toBeInTheDocument();
    });

    it('derives the route and time window for a flight', () => {
        const place: PlaceDraft = {
            kind: ACTIVITY_KIND.FLIGHT,
            flightSegments: [
                {
                    departAirport: 'EWR',
                    arrivalAirport: 'PTY',
                    departTime: '08:00',
                    arrivalTime: '14:00',
                },
            ] as PlaceDraft['flightSegments'],
        };
        renderWithProviders(
            <ReviewStep place={place} derivedName="Copa CM123" />
        );
        expect(screen.getByText('Flight')).toBeInTheDocument();
        expect(screen.getByText(leaf('EWR', 'PTY'))).toBeInTheDocument();
        expect(screen.getByText(leaf('08:00', '14:00'))).toBeInTheDocument();
    });

    it('derives the route for a transit entry', () => {
        const place: PlaceDraft = {
            kind: ACTIVITY_KIND.TRAIN,
            transitSegments: [
                {
                    departStation: 'Tokyo',
                    arrivalStation: 'Kyoto',
                    departTime: '09:00',
                    arrivalTime: '11:00',
                },
            ] as PlaceDraft['transitSegments'],
        };
        renderWithProviders(
            <ReviewStep place={place} derivedName="Shinkansen" />
        );
        expect(screen.getByText('Train')).toBeInTheDocument();
        expect(screen.getByText(leaf('Tokyo', 'Kyoto'))).toBeInTheDocument();
    });

    it('renders the note body for a note entry', () => {
        renderWithProviders(
            <ReviewStep
                place={{ kind: ACTIVITY_KIND.NOTE, note: 'Buy tickets' }}
                derivedName="Reminder"
            />
        );
        expect(screen.getByText('Note')).toBeInTheDocument();
        expect(screen.getByText('Buy tickets')).toBeInTheDocument();
    });

    it('renders the confirmation number row when present', () => {
        renderWithProviders(
            <ReviewStep
                place={{
                    kind: ACTIVITY_KIND.FLIGHT,
                    confirmationNumber: 'ABC123',
                }}
                derivedName="Copa CM123"
            />
        );
        expect(screen.getByText('Confirmation #')).toBeInTheDocument();
        expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    it('renders the thumbnail with the activity name as alt text', () => {
        renderWithProviders(
            <ReviewStep
                place={{
                    kind: ACTIVITY_KIND.PLACE,
                    image: { url: 'https://cdn.example/x.jpg' },
                }}
                derivedName="Louvre"
            />
        );
        expect(
            screen.getByRole('img', { name: 'Louvre' })
        ).toBeInTheDocument();
    });
});

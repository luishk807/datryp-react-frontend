import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import { NO_IMAGE } from 'constants';
import TripBox, { type TripBoxData } from './index';

// TripBox reads the logged-in user only to filter "myself" out of the trip's
// friend avatars — a minimal stub is all it needs.
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: { id: 'u1' } }),
}));

// A single-destination Confirmed trip far enough in the future that the day
// span (used for the stat row) is stable regardless of "today".
const singleConfirmed = {
    id: 42,
    name: 'Tokyo Adventure',
    startDate: '2999-05-01',
    endDate: '2999-05-07',
    status: { id: 2, name: 'Confirmed' },
    country: { name: 'Japan', image: 'https://img.example/japan.jpg' },
    image: 'https://img.example/trip.jpg',
    friends: [
        { id: 'f1', userId: 'other1', name: 'Alice', profileImageUrl: null },
        // Matches the logged-in user's id → filtered out of the avatars.
        { id: 'me', userId: 'u1', name: 'Me', profileImageUrl: null },
    ],
    intenaryDates: [
        {
            id: 1,
            date: '2999-05-01',
            activities: [{ kind: 'place' }, { kind: 'note' }],
        },
        { id: 2, date: '2999-05-02', activities: [{ kind: 'place' }] },
    ],
} as unknown as TripBoxData;

// A multi-destination Completed trip with a missing image (→ placeholder).
const multiCompleted = {
    id: 7,
    name: 'Euro Trip',
    startDate: '2020-06-01',
    endDate: '2020-06-10',
    status: { id: 3, name: 'Completed' },
    image: '',
    friends: [{ id: 'f1', userId: 'o1', name: 'Bob' }],
    intenaryDates: [
        {
            id: 1,
            date: '2020-06-01',
            country: { name: 'France', image: '' },
            activities: [{ kind: 'place' }],
        },
        {
            id: 2,
            date: '2020-06-05',
            country: { name: 'Italy', image: '' },
            activities: [],
        },
    ],
} as unknown as TripBoxData;

describe('TripBox — navigation mode', () => {
    it('renders a single-destination confirmed trip as a link to its detail page', () => {
        renderWithProviders(<TripBox data={singleConfirmed} />);

        expect(
            screen.getByRole('heading', { name: 'Tokyo Adventure' })
        ).toBeInTheDocument();
        expect(screen.getByText('Japan')).toBeInTheDocument();
        expect(screen.getByText('Confirmed')).toBeInTheDocument();
        expect(screen.getByText('One destination')).toBeInTheDocument();

        expect(screen.getByRole('link')).toHaveAttribute(
            'href',
            '/trip-detail?id=42'
        );
    });

    it('describes the trip image and shows the at-a-glance stat row', () => {
        renderWithProviders(<TripBox data={singleConfirmed} />);

        const img = screen.getByRole('img', { name: 'Japan' });
        expect(img).toHaveAttribute('src', 'https://img.example/trip.jpg');

        // 7-day span, 2 PLACE activities, and 1 companion (self excluded).
        expect(screen.getByText('7 days')).toBeInTheDocument();
        expect(screen.getByText('2 places')).toBeInTheDocument();
        expect(screen.getByText('1 going')).toBeInTheDocument();
    });

    it('renders a multi-destination completed trip with a truncated destination list', () => {
        renderWithProviders(<TripBox data={multiCompleted} />);

        expect(
            screen.getByRole('heading', { name: 'Euro Trip' })
        ).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Multiple destinations')).toBeInTheDocument();
        // First destination shown, remainder collapsed into "+1 more".
        expect(screen.getByTitle('France · Italy')).toBeInTheDocument();
        expect(screen.getByText('+1 more')).toBeInTheDocument();
        // Completed trips read as memory cards: friend count + length + places.
        expect(screen.getByText('1 friend')).toBeInTheDocument();
        expect(screen.getByText('10 days')).toBeInTheDocument();
        expect(screen.getByText('1 place')).toBeInTheDocument();
    });

    it('falls back to the placeholder image when the trip has none', () => {
        renderWithProviders(<TripBox data={multiCompleted} />);
        const img = screen.getByRole('img', { name: 'France · Italy' });
        expect(img).toHaveAttribute('src', NO_IMAGE);
    });

    it('uses a custom `to` target when provided', () => {
        renderWithProviders(
            <TripBox data={singleConfirmed} to="/trips/custom" />
        );
        expect(screen.getByRole('link')).toHaveAttribute(
            'href',
            '/trips/custom'
        );
    });
});

describe('TripBox — live planning trip', () => {
    const iso = (offsetDays: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        return d.toISOString().slice(0, 10);
    };

    it('shows a live day-counter and a planning-completeness pill', () => {
        const livePlanning = {
            id: 9,
            name: 'Right Now Trip',
            startDate: iso(-1),
            endDate: iso(3),
            status: { id: 1, name: 'Planning' },
            country: { name: 'Spain', image: 'https://img.example/spain.jpg' },
            image: 'https://img.example/now.jpg',
            friends: [],
            intenaryDates: [
                { id: 1, date: iso(-1), activities: [{ kind: 'place' }] },
                { id: 2, date: iso(0), activities: [{ kind: 'note' }] },
            ],
        } as unknown as TripBoxData;

        renderWithProviders(<TripBox data={livePlanning} />);
        // In-progress trip → "Live · Day X of Y" pill.
        expect(screen.getByText(/live · day/i)).toBeInTheDocument();
        // Planning trip with at least one filled day → "N% planned" pill.
        expect(screen.getByText(/planned/i)).toBeInTheDocument();
    });
});

describe('TripBox — selectable mode', () => {
    it('renders a toggle button (not a link) and fires onToggleSelect', async () => {
        const onToggleSelect = vi.fn();
        renderWithProviders(
            <TripBox
                data={singleConfirmed}
                selectable
                onToggleSelect={onToggleSelect}
            />
        );

        const toggle = screen.getByRole('button', {
            name: /select trip tokyo adventure/i,
        });
        expect(toggle).toHaveAttribute('aria-pressed', 'false');
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        // The status badge is dropped in selection mode.
        expect(screen.queryByText('Confirmed')).not.toBeInTheDocument();

        await userEvent.click(toggle);
        expect(onToggleSelect).toHaveBeenCalledTimes(1);
    });

    it('reflects the selected state via aria-pressed and the unselect label', () => {
        renderWithProviders(
            <TripBox data={singleConfirmed} selectable selected />
        );
        const toggle = screen.getByRole('button', {
            name: /unselect trip tokyo adventure/i,
        });
        expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });
});

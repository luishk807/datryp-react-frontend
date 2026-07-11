import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { HolidaySuggestionsResult } from 'api/holidaySuggestionsApi';

let mockUser: unknown = { isPaidMember: true };
let mockIsAdmin = false;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

let mockData: HolidaySuggestionsResult | undefined;
let mockIsLoading = false;
let mockIsError = false;
vi.mock('api/hooks/useHolidaySuggestions', () => ({
    useHolidaySuggestions: () => ({
        data: mockData,
        isLoading: mockIsLoading,
        isError: mockIsError,
    }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

import UpcomingHoliday from './index';

// ISO date five days out so the countdown reads "in 5 days" deterministically.
const inDaysISO = (days: number): string => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
};

const data = (
    over: Partial<HolidaySuggestionsResult> = {}
): HolidaySuggestionsResult => ({
    holiday: {
        name: 'Día de los Muertos',
        date: inDaysISO(5),
        country: 'Mexico',
        description: 'A vibrant celebration honoring loved ones.',
        imageUrl: null,
        photographerName: null,
        photographerUrl: null,
    },
    places: [
        {
            name: 'Oaxaca',
            country: 'Mexico',
            countryCode: 'MX',
            why: 'The heart of the festivities',
            imageUrl: 'http://img/oaxaca.jpg',
            photographerName: null,
            photographerUrl: null,
        },
    ],
    activities: [
        { title: 'Build an ofrenda', description: 'Honor ancestors with an altar' },
    ],
    ...over,
});

beforeEach(() => {
    mockUser = { isPaidMember: true };
    mockIsAdmin = false;
    mockData = undefined;
    mockIsLoading = false;
    mockIsError = false;
    mockNavigate.mockReset();
});

describe('UpcomingHoliday', () => {
    it('renders nothing for free (non-Pro) users', () => {
        mockUser = { isPaidMember: false };
        const { container } = renderWithProviders(<UpcomingHoliday />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows a loading state for Pro users', () => {
        mockIsLoading = true;
        renderWithProviders(<UpcomingHoliday />);
        expect(screen.getByText('Upcoming holiday')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Things to do' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Places to celebrate it' })
        ).toBeInTheDocument();
    });

    it('renders nothing on error', () => {
        mockIsError = true;
        const { container } = renderWithProviders(<UpcomingHoliday />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the holiday, its countdown, activities, and places', () => {
        mockData = data();
        renderWithProviders(<UpcomingHoliday />);
        expect(
            screen.getByRole('heading', { name: 'Día de los Muertos' })
        ).toBeInTheDocument();
        // "Mexico" appears both as the holiday country pill and the place card.
        expect(screen.getAllByText('Mexico').length).toBeGreaterThan(0);
        expect(
            screen.getByText('A vibrant celebration honoring loved ones.')
        ).toBeInTheDocument();
        expect(screen.getByText('in 5 days')).toBeInTheDocument();
        expect(screen.getByText('Build an ofrenda')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Oaxaca' })
        ).toBeInTheDocument();
    });

    it('navigates to the city detail page when a place card is clicked', async () => {
        mockData = data();
        renderWithProviders(<UpcomingHoliday />);
        await userEvent.click(screen.getByRole('button', { name: /Oaxaca/ }));
        expect(mockNavigate).toHaveBeenCalledWith(
            '/city?name=Oaxaca&country=Mexico&code=MX&mode=single'
        );
    });

    it('hides the country pill for an "International" holiday', () => {
        mockData = data({
            holiday: {
                name: 'New Year’s Day',
                date: inDaysISO(20),
                country: 'International',
                description: 'Worldwide celebrations.',
                imageUrl: null,
                photographerName: null,
                photographerUrl: null,
            },
        });
        renderWithProviders(<UpcomingHoliday />);
        expect(screen.queryByText('International')).not.toBeInTheDocument();
    });
});

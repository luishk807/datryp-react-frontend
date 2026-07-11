import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

let mockSuggestions: {
    data: unknown;
    isLoading: boolean;
    isError: boolean;
} = { data: [], isLoading: false, isError: false };
vi.mock('api/hooks/usePlaceSuggestions', () => ({
    usePlaceSuggestions: () => mockSuggestions,
}));

// PymlCard resolves an image fallback only when a suggestion lacks one; our
// fixtures always carry an imageUrl so this never fires — stub it out.
vi.mock('api/hooks/usePlaceImage', () => ({
    usePlaceImage: () => ({ data: undefined }),
}));

import PlacesYouMightLove from './index';

const suggestion = (over: Record<string, unknown> = {}) => ({
    name: 'Paris',
    country: 'France',
    countryCode: 'FR',
    why: 'City of light',
    imageUrl: 'https://img.example/paris.jpg',
    photographerName: null,
    photographerUrl: null,
    latitude: 48.8,
    longitude: 2.3,
    ...over,
});

beforeEach(() => {
    mockUser = { id: 'u1' };
    mockSuggestions = { data: [], isLoading: false, isError: false };
});

describe('PlacesYouMightLove', () => {
    it('renders nothing for a signed-out visitor', () => {
        mockUser = null;
        mockSuggestions = {
            data: [suggestion()],
            isLoading: false,
            isError: false,
        };
        const { container } = renderWithProviders(<PlacesYouMightLove />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing on error or when the list is empty', () => {
        mockSuggestions = { data: [], isLoading: false, isError: true };
        const { container } = renderWithProviders(<PlacesYouMightLove />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows a titled, live skeleton region while loading', () => {
        mockSuggestions = {
            data: undefined,
            isLoading: true,
            isError: false,
        };
        renderWithProviders(<PlacesYouMightLove />);
        expect(
            screen.getByRole('heading', { name: /places you might love/i })
        ).toBeInTheDocument();
        // No real cards yet.
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders a PlaceCard per suggestion and navigates to the city on click', async () => {
        mockSuggestions = {
            data: [suggestion(), suggestion({ name: 'Rome', country: 'Italy', countryCode: 'IT' })],
            isLoading: false,
            isError: false,
        };
        renderWithProviders(<PlacesYouMightLove />);

        expect(
            screen.getByRole('heading', { name: /places you might love/i })
        ).toBeInTheDocument();
        const img = screen.getByRole('img', { name: 'Paris, France' });
        expect(img).toHaveAttribute('src', 'https://img.example/paris.jpg');

        await userEvent.click(screen.getByRole('button', { name: /Paris/i }));
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.stringContaining('/city?name=Paris')
        );
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.stringContaining('mode=single')
        );
    });

    it('renders the compact empty-trips variant capped at four labelled cards', async () => {
        mockSuggestions = {
            data: [
                suggestion({ name: 'A', countryCode: 'AA' }),
                suggestion({ name: 'B', countryCode: 'BB' }),
                suggestion({ name: 'C', countryCode: 'CC' }),
                suggestion({ name: 'D', countryCode: 'DD' }),
                suggestion({ name: 'E', countryCode: 'EE' }),
            ],
            isLoading: false,
            isError: false,
        };
        renderWithProviders(<PlacesYouMightLove variant="empty-trips" />);

        const cards = screen.getAllByRole('listitem');
        expect(cards).toHaveLength(4);
        const first = screen.getByRole('button', { name: 'Open A, France' });
        await userEvent.click(first);
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.stringContaining('/city?name=A')
        );
    });
});

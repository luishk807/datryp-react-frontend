import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';

// This page composes ~50 data-fetching child sections. We only exercise the
// page's own logic (route parsing, load/error/not-found/loaded branches), so
// every child is stubbed to a passthrough — that keeps their queries from
// firing (MSW is `onUnhandledRequest: 'error'`) and keeps the test focused on
// index.tsx. `ErrorPage` is left real so its error/empty copy is observable.
const { modStub } = vi.hoisted(() => {
    const Pass = (props: { children?: unknown }) => props.children ?? null;
    return { modStub: () => ({ default: Pass }) };
});

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ title, children }: { title?: string; children: ReactNode }) => (
        <div>
            <span data-testid="layout-title">{title}</span>
            {children}
        </div>
    ),
}));

vi.mock('components/common/ParagraphSkeleton', modStub);
vi.mock('components/ShareButton', modStub);
vi.mock('components/BookmarkButton', modStub);
vi.mock('components/DetailTour', modStub);
vi.mock('components/VisitedButton', modStub);
vi.mock('components/AddToBucketButton', modStub);
vi.mock('components/FriendsVisitedBadge', modStub);
vi.mock('components/AddToItineraryButton', modStub);
vi.mock('components/common/Stars', modStub);
vi.mock('components/common/CostBadge', modStub);
vi.mock('components/common/GoogleGlyph', modStub);
vi.mock('components/Review/ReviewSection', modStub);
vi.mock('components/Review/ReviewSummary', modStub);
vi.mock('components/PlaceDetail/ParagraphSection', modStub);
vi.mock('components/PlaceDetail/PlaceDescription', modStub);
vi.mock('components/PlaceDetail/HighlightsSection', modStub);
vi.mock('components/PlaceDetail/WeatherSection', modStub);
vi.mock('components/PlaceDetail/CurrencySection', modStub);
vi.mock('components/PlaceDetail/SafetySection', modStub);
vi.mock('components/PlaceDetail/GettingThereSection', modStub);
vi.mock('components/PlaceDetail/PopularitySection', modStub);
vi.mock('components/PlaceDetail/TravelerInsightsSection', modStub);
vi.mock('components/PlaceDetail/CulturalShockCallout', modStub);
vi.mock('components/PlaceDetail/ExperienceHighlights', modStub);
vi.mock('components/PlaceDetail/AirportsSection', modStub);
vi.mock('components/PlaceDetail/EssentialAppsSection', modStub);
vi.mock('components/PlaceDetail/DetailFactsGrid', modStub);
vi.mock('components/PlaceDetail/CountryFactsSection', modStub);
vi.mock('components/PlaceDetail/ReligionSection', modStub);
vi.mock('components/PlaceDetail/EtiquetteSection', modStub);
vi.mock('components/PlaceDetail/TippingSection', modStub);
vi.mock('components/PlaceDetail/CurrencyTipsSection', modStub);
vi.mock('components/PlaceDetail/AvgCostsSection', modStub);
vi.mock('components/PlaceDetail/TapWaterSection', modStub);
vi.mock('components/PlaceDetail/AirQualitySection', modStub);
vi.mock('components/PlaceDetail/WalkabilitySection', modStub);
vi.mock('components/PlaceDetail/WifiSection', modStub);
vi.mock('components/PlaceDetail/MatchForYouSection', modStub);
vi.mock('components/PlaceDetail/FestivalsSection', modStub);
vi.mock('components/PlaceDetail/StayingSafeSection', modStub);
vi.mock('components/PlaceDetail/ScamsSection', modStub);
vi.mock('components/PlaceDetail/HealthSection', modStub);
vi.mock('components/PlaceDetail/AccessibilitySection', modStub);
vi.mock('components/PlaceDetail/BeforeYouGoSection', modStub);
vi.mock('components/PlaceDetail/HiddenGemsSection', modStub);
vi.mock('components/PlaceDetail/NotesSection', modStub);
vi.mock('components/PlaceDetail/TipListSection', modStub);
vi.mock('components/PlaceDetail/BudgetSection', modStub);
vi.mock('components/PlaceDetail/PlaceHero', modStub);
vi.mock('components/PlaceDetail/VisaSection', modStub);
vi.mock('components/PlaceDetail/TravelAdvisorySection', modStub);
vi.mock('components/PlaceDetail/PracticalInfoSection', modStub);
vi.mock('components/PlaceDetail/WhenToVisitSection', modStub);
vi.mock('components/PlaceDetail/LatestNewsSection', modStub);
vi.mock('components/PlaceDetail/NearbySection', modStub);
vi.mock('components/PlaceDetail/LocalFlavorSection', modStub);
vi.mock('components/PlaceDetail/PlaceMetaLine', modStub);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

interface HookState {
    data?: unknown;
    isLoading?: boolean;
    isError?: boolean;
    error?: unknown;
}

let mockSearch: HookState;
let mockDirect: HookState;
let mockDetails: Record<string, unknown>;
let mockUser: unknown = null;

vi.mock('api/hooks/useSearchPlaces', () => ({
    useSearchPlaces: () => mockSearch,
}));
vi.mock('api/hooks/usePlaceDirect', () => ({
    usePlaceDirect: () => mockDirect,
}));
vi.mock('api/hooks/usePlaceDetails', () => ({
    usePlaceDetailsProgressive: () => mockDetails,
}));
vi.mock('api/hooks/usePlaceImage', () => ({
    usePlaceImage: () => ({ data: undefined }),
}));
vi.mock('api/hooks/usePlaceRating', () => ({
    usePlaceRating: () => mockRating,
}));
vi.mock('api/hooks/useVisitedPlaces', () => ({
    useVisitedPlaces: () => mockVisited,
}));
vi.mock('api/hooks/useItineraries', () => ({
    useMyItineraries: () => ({ data: undefined }),
}));
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

import { getPlaceKey } from 'utils/placeKey';
import PlaceDetail from './index';

let mockRating: { data: unknown };
let mockVisited: { data: unknown };

const place = {
    name: 'Kyoto',
    city: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    description: 'Ancient temples and quiet gardens.',
    rating: 4.6,
    bestTimeToVisit: 'Spring',
    imageUrl: 'https://img/kyoto.jpg',
    photographerName: 'Ken',
    photographerUrl: 'https://u/ken',
};

const loadedSearch = (query = 'Kyoto'): HookState => ({
    data: { items: [place], query },
    isLoading: false,
    isError: false,
    error: null,
});

const emptyDetails = (): Record<string, unknown> => ({
    details: {},
    isLoading: false,
    isError: false,
    error: null,
    proseError: false,
    listsError: false,
    factsError: false,
    proseLoading: false,
    listsLoading: false,
    factsLoading: false,
});

beforeEach(() => {
    mockNavigate.mockReset();
    mockUser = null;
    mockSearch = loadedSearch();
    mockDirect = { data: undefined, isLoading: false, isError: false };
    mockDetails = emptyDetails();
    mockRating = { data: undefined };
    mockVisited = { data: undefined };
});

describe('PlaceDetail', () => {
    it('shows the "no place selected" error when the query is missing', () => {
        renderWithProviders(<PlaceDetail />, { route: '/place' });
        expect(
            screen.getByRole('heading', { name: 'No place selected' })
        ).toBeInTheDocument();
    });

    it('renders the instant hero + name while the recommendation loads', () => {
        mockSearch = { data: undefined, isLoading: true, isError: false };
        renderWithProviders(<PlaceDetail />, { route: '/place?q=Kyoto&i=0' });
        expect(screen.getByTestId('layout-title')).toHaveTextContent('Kyoto…');
        expect(
            screen.getByRole('heading', { name: 'Kyoto' })
        ).toBeInTheDocument();
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows the error page with the failure message when the search errors', () => {
        mockSearch = {
            data: undefined,
            isLoading: false,
            isError: true,
            error: new Error('recommender exploded'),
        };
        renderWithProviders(<PlaceDetail />, { route: '/place?q=Kyoto&i=0' });
        expect(
            screen.getByRole('heading', { name: 'Could not load this place' })
        ).toBeInTheDocument();
        expect(
            screen.getByText('recommender exploded')
        ).toBeInTheDocument();
    });

    it('shows "place not found" when the result set has no item at the index', () => {
        mockSearch = {
            data: { items: [], query: 'Kyoto' },
            isLoading: false,
            isError: false,
            error: null,
        };
        renderWithProviders(<PlaceDetail />, { route: '/place?q=Kyoto&i=0' });
        expect(
            screen.getByRole('heading', { name: 'Place not found' })
        ).toBeInTheDocument();
    });

    it('renders the loaded place with headline, back link, and search-match badge', () => {
        mockSearch = loadedSearch('temples');
        renderWithProviders(<PlaceDetail />, { route: '/place?q=temples&i=0' });
        expect(
            screen.getByRole('heading', { level: 1, name: 'Kyoto' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Back to/i })
        ).toBeInTheDocument();
        expect(
            screen.getByText('Matches your search: temples')
        ).toBeInTheDocument();
    });

    it('renders the Google rating, visited-on line, and language meta when present', () => {
        mockDetails = {
            ...emptyDetails(),
            details: {
                costLevel: 3,
                travelBasics: { language: 'Japanese' },
                coordinates: { lat: 35, lng: 135 },
            },
        };
        mockRating = {
            data: {
                rating: 4.3,
                userRatingCount: 1200,
                googleMapsUri: 'https://maps.example/kyoto',
            },
        };
        mockVisited = {
            data: {
                items: [
                    {
                        placeKey: getPlaceKey('Kyoto', 'Kyoto', 'Japan'),
                        visitedAt: '2026-01-02T00:00:00Z',
                    },
                ],
            },
        };
        renderWithProviders(<PlaceDetail />, { route: '/place?q=Kyoto&i=0' });
        expect(screen.getByText('Japanese')).toBeInTheDocument();
        expect(screen.getByText(/Visited on/i)).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Google/i })
        ).toHaveAttribute('href', 'https://maps.example/kyoto');
    });

    it('resolves via the go-direct path when city + country are in the URL', () => {
        mockDirect = loadedSearch('Kyoto');
        renderWithProviders(<PlaceDetail />, {
            route: '/place?q=Kyoto&city=Kyoto&country=Japan',
        });
        expect(
            screen.getByRole('heading', { level: 1, name: 'Kyoto' })
        ).toBeInTheDocument();
        // Direct mode suppresses the search-match echo.
        expect(
            screen.queryByText(/Matches your search/i)
        ).not.toBeInTheDocument();
    });
});

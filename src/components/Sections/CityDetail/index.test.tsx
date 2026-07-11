import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';

// Composite page — every data-fetching child section is stubbed to a
// passthrough so their queries don't fire (MSW is `onUnhandledRequest:
// 'error'`) and the test stays on the page's own load/error/loaded logic.
// `ErrorPage` stays real so its copy is observable.
const { modStub } = vi.hoisted(() => {
    const Pass = (props: { children?: unknown }) => props.children ?? null;
    return { modStub: () => ({ default: Pass }) };
});

// Faithful to the real SubLayout: it renders an <h1> ONLY when given a
// `title`. Detail pages pass no title (their in-page name is the single h1),
// so this stays null — but if a title is ever re-introduced the duplicate-h1
// guard below will catch it.
vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ title, children }: { title?: string; children: ReactNode }) =>
        title ? (
            <div>
                <h1 data-testid="layout-title">{title}</h1>
                {children}
            </div>
        ) : (
            <div>{children}</div>
        ),
}));

vi.mock('components/common/CostBadge', modStub);
vi.mock('components/common/Stars', modStub);
vi.mock('components/Review/ReviewSection', modStub);
vi.mock('components/Review/ReviewSummary', modStub);
vi.mock('components/BookmarkCityButton', modStub);
vi.mock('components/DetailTour', modStub);
vi.mock('components/VisitedCityButton', modStub);
vi.mock('components/AddToBucketButton', modStub);
vi.mock('components/FriendsVisitedBadge', modStub);
vi.mock('components/ShareButton', modStub);
vi.mock('components/PlaceDetail/PlaceHero', modStub);
vi.mock('components/PlaceDetail/WeatherSection', modStub);
vi.mock('components/PlaceDetail/CurrencySection', modStub);
vi.mock('components/PlaceDetail/SafetySection', modStub);
vi.mock('components/PlaceDetail/PopularitySection', modStub);
vi.mock('components/PlaceDetail/CulturalShockCallout', modStub);
vi.mock('components/PlaceDetail/ExperienceHighlights', modStub);
vi.mock('components/PlaceDetail/ParagraphSection', modStub);
vi.mock('components/PlaceDetail/NotesSection', modStub);
vi.mock('components/PlaceDetail/BudgetSection', modStub);
vi.mock('components/PlaceDetail/LocalFlavorSection', modStub);
vi.mock('components/PlaceDetail/NearbySection', modStub);
vi.mock('components/PlaceDetail/VisaSection', modStub);
vi.mock('components/PlaceDetail/TravelAdvisorySection', modStub);
vi.mock('components/PlaceDetail/WhenToVisitSection', modStub);
vi.mock('components/PlaceDetail/LatestNewsSection', modStub);
vi.mock('components/PlaceDetail/PracticalInfoSection', modStub);
vi.mock('components/PlaceDetail/TipListSection', modStub);
vi.mock('components/PlaceDetail/GettingThereSection', modStub);
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
vi.mock('components/PlaceDetail/PlaceMetaLine', modStub);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

const mockDispatch = vi.fn();
vi.mock('context/TripContext', async (importOriginal) => ({
    ...(await importOriginal<typeof import('context/TripContext')>()),
    useTripDispatch: () => mockDispatch,
}));

let mockCityDetails: Record<string, unknown>;

vi.mock('api/hooks/useCityDetails', () => ({
    useCityDetailsProgressive: () => mockCityDetails,
}));
vi.mock('api/hooks/usePlaceImage', () => ({
    usePlaceImage: () => ({ data: undefined }),
}));
vi.mock('api/hooks/useHomeDeparture', () => ({
    useNearestAirport: () => ({ data: undefined }),
}));
vi.mock('api/hooks/useDestinationAirport', () => ({
    useDestinationAirport: () => ({ data: undefined }),
}));
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: null }),
}));

import CityDetail from './index';

const city = {
    name: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    countryId: 'jp-uuid',
    imageUrl: 'https://img/kyoto.jpg',
    photographerName: 'Ken',
    photographerUrl: 'https://u/ken',
};

const loaded = (): Record<string, unknown> => ({
    city,
    details: {
        costLevel: 2,
        cityHighlight: 'A temple city',
        touristRating: 4.5,
        travelBasics: { language: 'Japanese' },
        coordinates: { lat: 35, lng: 135 },
    },
    isLoading: false,
    isError: false,
    error: null,
    listsLoading: false,
    factsLoading: false,
});

const ROUTE = '/city?name=Kyoto&country=Japan&code=JP';

beforeEach(() => {
    mockNavigate.mockReset();
    mockDispatch.mockReset();
    mockCityDetails = loaded();
});

describe('CityDetail', () => {
    it('shows the "missing city info" error when the URL lacks params', () => {
        renderWithProviders(<CityDetail />, { route: '/city' });
        expect(
            screen.getByRole('heading', { name: 'Missing city info' })
        ).toBeInTheDocument();
    });

    it('renders the instant hero + name while details load', () => {
        mockCityDetails = {
            city: undefined,
            details: {},
            isLoading: true,
            isError: false,
            error: null,
            listsLoading: true,
            factsLoading: true,
        };
        renderWithProviders(<CityDetail />, { route: ROUTE });
        // Single h1 even while loading — the in-page name, no shell title.
        const h1s = screen.getAllByRole('heading', { level: 1 });
        expect(h1s).toHaveLength(1);
        expect(h1s[0]).toHaveTextContent('Kyoto');
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows the error page when the prose slice fails', () => {
        mockCityDetails = {
            city: undefined,
            details: {},
            isLoading: false,
            isError: true,
            error: new Error('city blew up'),
            listsLoading: false,
            factsLoading: false,
        };
        renderWithProviders(<CityDetail />, { route: ROUTE });
        expect(
            screen.getByRole('heading', { name: 'Could not load this city' })
        ).toBeInTheDocument();
        expect(screen.getByText('city blew up')).toBeInTheDocument();
    });

    it('renders the loaded city with headline, highlight, and plan CTA', () => {
        renderWithProviders(<CityDetail />, { route: ROUTE });
        // Exactly one h1 on the page — the city name (no shell-title h1).
        const h1s = screen.getAllByRole('heading', { level: 1 });
        expect(h1s).toHaveLength(1);
        expect(h1s[0]).toHaveTextContent('Kyoto');
        expect(screen.getByText('A temple city')).toBeInTheDocument();
        expect(screen.getByText('Japanese')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Start planning/i })
        ).toBeInTheDocument();
    });

    it('starts a trip when the plan CTA is clicked', async () => {
        renderWithProviders(<CityDetail />, { route: ROUTE });
        await userEvent.click(
            screen.getByRole('button', { name: /Start planning/i })
        );
        expect(mockDispatch).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalled();
    });

    it('navigates back when the back button is clicked', async () => {
        renderWithProviders(<CityDetail />, { route: ROUTE });
        await userEvent.click(screen.getByRole('button', { name: /Back/i }));
        expect(mockNavigate).toHaveBeenCalled();
    });

    it('labels the CTA for a multi-destination trip in multiple mode', () => {
        renderWithProviders(<CityDetail />, { route: `${ROUTE}&mode=multiple` });
        expect(
            screen.getByRole('button', {
                name: /Start multi-destination trip/i,
            })
        ).toBeInTheDocument();
    });
});

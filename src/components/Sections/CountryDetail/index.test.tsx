import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';

// Composite page — every data-fetching child section is stubbed to a
// passthrough so their queries don't fire (MSW is `onUnhandledRequest:
// 'error'`). `MainSection` is stubbed too, but its passthrough still renders
// the page-owned top-cities list. `ErrorPage` stays real.
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

vi.mock('components/common/CostBadge', modStub);
vi.mock('components/common/Stars', modStub);
vi.mock('components/Review/ReviewSection', modStub);
vi.mock('components/Review/ReviewSummary', modStub);
vi.mock('components/VisitedCountryButton', modStub);
vi.mock('components/DetailTour', modStub);
vi.mock('components/AddToBucketButton', modStub);
vi.mock('components/FriendsVisitedBadge', modStub);
vi.mock('components/BookmarkCountryButton', modStub);
vi.mock('components/ShareButton', modStub);
vi.mock('components/PlaceDetail/PlaceHero', modStub);
vi.mock('components/PlaceDetail/WeatherSection', modStub);
vi.mock('components/PlaceDetail/CurrencySection', modStub);
vi.mock('components/PlaceDetail/SafetySection', modStub);
vi.mock('components/PlaceDetail/PopularitySection', modStub);
vi.mock('components/PlaceDetail/GettingThereSection', modStub);
vi.mock('components/PlaceDetail/CulturalShockCallout', modStub);
vi.mock('components/PlaceDetail/ExperienceHighlights', modStub);
vi.mock('components/PlaceDetail/ParagraphSection', modStub);
vi.mock('components/PlaceDetail/NotesSection', modStub);
vi.mock('components/PlaceDetail/BudgetSection', modStub);
vi.mock('components/PlaceDetail/LocalFlavorSection', modStub);
vi.mock('components/PlaceDetail/NearbySection', modStub);
vi.mock('components/PlaceDetail/VisaSection', modStub);
vi.mock('components/PlaceDetail/TravelAdvisorySection', modStub);
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
vi.mock('components/PlaceDetail/WifiSection', modStub);
vi.mock('components/PlaceDetail/MatchForYouSection', modStub);
vi.mock('components/PlaceDetail/FestivalsSection', modStub);
vi.mock('components/PlaceDetail/StayingSafeSection', modStub);
vi.mock('components/PlaceDetail/ScamsSection', modStub);
vi.mock('components/PlaceDetail/HealthSection', modStub);
vi.mock('components/PlaceDetail/AccessibilitySection', modStub);
vi.mock('components/PlaceDetail/BeforeYouGoSection', modStub);
vi.mock('components/PlaceDetail/HiddenGemsSection', modStub);
vi.mock('components/PlaceDetail/WhenToVisitSection', modStub);
vi.mock('components/PlaceDetail/LatestNewsSection', modStub);
vi.mock('components/PlaceDetail/PracticalInfoSection', modStub);
vi.mock('components/PlaceDetail/TipListSection', modStub);
vi.mock('components/PlaceDetail/MainSection', modStub);
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

let mockCountryDetails: Record<string, unknown>;
let mockMonthly: { data: unknown };

vi.mock('api/hooks/useCountryDetails', () => ({
    useCountryDetailsProgressive: () => mockCountryDetails,
}));
vi.mock('api/hooks/useCountries', () => ({
    useCountries: () => ({ data: undefined }),
}));
vi.mock('api/hooks/usePlaceImage', () => ({
    usePlaceImage: () => ({ data: undefined }),
}));
vi.mock('api/hooks/useMonthlyBestPlace', () => ({
    useMonthlyBestPlace: () => mockMonthly,
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

import CountryDetail from './index';

const country = {
    id: 'jp-id',
    name: 'Japan',
    code: 'JP',
    local: 'Nihon',
    image: 'https://img/jp.jpg',
    photographerName: 'Ken',
    photographerUrl: 'https://u/ken',
};

const loaded = (): Record<string, unknown> => ({
    country,
    details: {
        costLevel: 3,
        countryHighlight: 'Land of the rising sun',
        capitalCity: 'Tokyo',
        capitalCoordinates: { lat: 35, lng: 139 },
        travelBasics: { language: 'Japanese' },
        touristRating: 4.7,
        topCities: [{ name: 'Kyoto', why: 'temples' }],
    },
    isLoading: false,
    isError: false,
    error: null,
    listsLoading: false,
    factsLoading: false,
});

beforeEach(() => {
    mockNavigate.mockReset();
    mockDispatch.mockReset();
    mockCountryDetails = loaded();
    mockMonthly = { data: undefined };
});

describe('CountryDetail', () => {
    it('shows the "no country selected" error when the code is missing', () => {
        renderWithProviders(<CountryDetail />, { route: '/country' });
        expect(
            screen.getByRole('heading', { name: 'No country selected' })
        ).toBeInTheDocument();
    });

    it('renders the instant hero + name (ISO code) while details load', () => {
        mockCountryDetails = {
            country: undefined,
            details: {},
            isLoading: true,
            isError: false,
            error: null,
            listsLoading: true,
            factsLoading: true,
        };
        renderWithProviders(<CountryDetail />, { route: '/country?code=JP' });
        expect(screen.getByTestId('layout-title')).toHaveTextContent('JP…');
        expect(screen.getByRole('heading', { name: 'JP' })).toBeInTheDocument();
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows the error page when the prose slice fails', () => {
        mockCountryDetails = {
            country: undefined,
            details: {},
            isLoading: false,
            isError: true,
            error: new Error('country blew up'),
            listsLoading: false,
            factsLoading: false,
        };
        renderWithProviders(<CountryDetail />, { route: '/country?code=JP' });
        expect(
            screen.getByRole('heading', { name: 'Could not load this country' })
        ).toBeInTheDocument();
        expect(screen.getByText('country blew up')).toBeInTheDocument();
    });

    it('renders the loaded country with headline, top cities, and plan CTA', () => {
        renderWithProviders(<CountryDetail />, { route: '/country?code=JP' });
        expect(
            screen.getByRole('heading', { level: 1, name: 'Japan' })
        ).toBeInTheDocument();
        expect(screen.getByText('Land of the rising sun')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Kyoto/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Start planning/i })
        ).toBeInTheDocument();
    });

    it('starts a trip when the plan CTA is clicked', async () => {
        renderWithProviders(<CountryDetail />, { route: '/country?code=JP' });
        await userEvent.click(
            screen.getByRole('button', { name: /Start planning/i })
        );
        expect(mockDispatch).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/single', { replace: true });
    });

    it('routes through /preparing-trip in the monthly-best-place seed flow', async () => {
        mockMonthly = {
            data: {
                place: { name: 'Kyoto', countryCode: 'JP' },
                highlights: ['Fushimi Inari', 'Arashiyama'],
            },
        };
        renderWithProviders(<CountryDetail />, {
            route: '/country?code=JP&seed=monthly-best-place',
        });
        const cta = screen.getByRole('button', {
            name: /Plan trip with these picks/i,
        });
        await userEvent.click(cta);
        expect(mockNavigate).toHaveBeenCalledWith(
            '/preparing-trip',
            expect.objectContaining({ state: expect.anything() })
        );
    });
});

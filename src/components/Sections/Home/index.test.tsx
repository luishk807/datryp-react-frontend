import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders';

// The landing page composes the SearchBar + ~17 discovery/personal strips, each
// with its own data hooks. Stub them all so their queries don't fire (MSW is
// `onUnhandledRequest: 'error'`) — the test covers the page's own hero/search
// region + the signed-in / anonymous / mobile branching. `TopPlaces` gets a
// visible marker so we can prove a discovery strip is composed in.
const { modStub, focusInputSpy } = vi.hoisted(() => {
    const Pass = (props: { children?: unknown }) => props.children ?? null;
    return { modStub: () => ({ default: Pass }), focusInputSpy: vi.fn() };
});

vi.mock('components/common/Layout', modStub);
// SearchBar is stubbed to a forwardRef that exposes the same `focusInput`
// imperative handle the real one does, so we can assert the hero moves focus
// into the field when a search-mode tab is activated.
vi.mock('components/SearchBar', async () => {
    const { forwardRef, useImperativeHandle } = await import('react');
    return {
        __esModule: true,
        default: forwardRef((_props, ref) => {
            useImperativeHandle(ref, () => ({ focusInput: focusInputSpy }));
            return null;
        }),
    };
});
vi.mock('components/TopPlaces', () => ({
    default: () => <div>trending-strip</div>,
}));
vi.mock('components/NextMonthPicks', modStub);
vi.mock('components/PlacesYouMightLove', modStub);
vi.mock('components/SimilarToSaves', modStub);
vi.mock('components/UpcomingHoliday', modStub);
vi.mock('components/WorldEvent', modStub);
vi.mock('components/CountryOfBirthEvent', modStub);
vi.mock('components/MonthlyBestPlace', modStub);
vi.mock('components/SeasonalBestPlaces', modStub);
vi.mock('components/AiTripBuilderCard', modStub);
vi.mock('components/AtlasSummaryCard', modStub);
vi.mock('components/HomeContinuePlanning', modStub);
vi.mock('components/HomeBucketStrip', modStub);
vi.mock('components/HomeUpcomingTrips', modStub);
vi.mock('components/HomeRecentlyViewed', modStub);
vi.mock('components/HomeTour', modStub);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

let mockIsMobile = false;
vi.mock('@mui/material', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@mui/material')>()),
    useMediaQuery: () => mockIsMobile,
}));

let mockUser: unknown = null;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

let mockHero: { data: unknown };
vi.mock('api/hooks/useHeroImages', () => ({
    useHeroImages: () => mockHero,
}));

import Home from './index';

beforeEach(() => {
    mockNavigate.mockReset();
    focusInputSpy.mockReset();
    mockUser = null;
    mockIsMobile = false;
    mockHero = { data: undefined };
});

describe('Home', () => {
    it('renders the anonymous hero, both search-mode tabs, and a discovery strip', () => {
        const { container } = renderWithProviders(<Home />);
        expect(
            screen.getByRole('heading', { level: 1, name: 'Where to next?' })
        ).toBeInTheDocument();
        expect(screen.getAllByRole('tab')).toHaveLength(2);
        expect(
            screen.getByRole('tab', { name: 'Search by place' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Let us plan a trip for you' })
        ).toBeInTheDocument();
        expect(screen.getByText('trending-strip')).toBeInTheDocument();
        // Hero images unresolved → falls back to a bundled placeholder photo.
        expect(
            container.querySelector('img.home-hero-bg-photo')
        ).toBeInTheDocument();
    });

    it('greets a signed-in user by name in the hero title', () => {
        mockUser = { name: 'Ana Lopez', email: 'ana@example.com' };
        renderWithProviders(<Home />);
        expect(
            screen.getByRole('heading', {
                level: 1,
                name: 'Where to next, Ana?',
            })
        ).toBeInTheDocument();
    });

    it('renders the mobile dashboard with a greeting when signed in on mobile', () => {
        mockUser = { name: 'Ana Lopez', email: 'ana@example.com' };
        mockIsMobile = true;
        renderWithProviders(<Home />);
        // Mobile drops the name from the title and shows it in the greeting.
        expect(
            screen.getByRole('heading', { level: 1, name: 'Where to next?' })
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Good (morning|afternoon|evening), Ana/)
        ).toBeInTheDocument();
        expect(screen.getByText('trending-strip')).toBeInTheDocument();
    });

    it('renders Unsplash attribution when a backend hero image resolves', () => {
        mockHero = {
            data: [
                {
                    imageUrl: 'https://images.example/kyoto.jpg',
                    photographerName: 'Ann Shot',
                    photographerUrl: 'https://unsplash.com/@ann',
                },
            ],
        };
        renderWithProviders(<Home />);
        expect(
            screen.getByRole('link', { name: 'Ann Shot' })
        ).toHaveAttribute('href', 'https://unsplash.com/@ann');
    });

    it('switches the active search-mode tab on click', async () => {
        renderWithProviders(<Home />);
        const interestTab = screen.getByRole('tab', {
            name: 'Search by interest',
        });
        expect(interestTab).toHaveAttribute('aria-selected', 'false');
        await userEvent.click(interestTab);
        expect(interestTab).toHaveAttribute('aria-selected', 'true');
    });

    it('exposes the switcher as an APG tablist with a labelled, controlled panel', () => {
        renderWithProviders(<Home />);
        const placeTab = screen.getByRole('tab', { name: 'Search by place' });
        const interestTab = screen.getByRole('tab', {
            name: 'Search by interest',
        });

        // Roving tabindex: only the selected tab sits in the Tab order.
        expect(placeTab).toHaveAttribute('tabindex', '0');
        expect(interestTab).toHaveAttribute('tabindex', '-1');

        // The panel is controlled by, and labelled by, the active tab.
        const panel = screen.getByRole('tabpanel');
        expect(placeTab).toHaveAttribute('aria-controls', panel.id);
        expect(panel).toHaveAttribute('aria-labelledby', placeTab.id);
    });

    it('roves between search-mode tabs with the arrow keys, activating on move', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Home />);
        const placeTab = screen.getByRole('tab', { name: 'Search by place' });
        const interestTab = screen.getByRole('tab', {
            name: 'Search by interest',
        });

        placeTab.focus();
        expect(placeTab).toHaveFocus();

        await user.keyboard('{ArrowRight}');
        expect(interestTab).toHaveFocus();
        expect(interestTab).toHaveAttribute('aria-selected', 'true');
        expect(interestTab).toHaveAttribute('tabindex', '0');
        expect(placeTab).toHaveAttribute('tabindex', '-1');
        // The panel label follows the newly-activated tab.
        expect(screen.getByRole('tabpanel')).toHaveAttribute(
            'aria-labelledby',
            interestTab.id
        );

        // ArrowLeft wraps back to the first tab and re-activates it.
        await user.keyboard('{ArrowLeft}');
        expect(placeTab).toHaveFocus();
        expect(placeTab).toHaveAttribute('aria-selected', 'true');

        // Arrow roving keeps focus on the tabs — it must NOT yank focus into
        // the search field (that only happens on deliberate activation).
        expect(focusInputSpy).not.toHaveBeenCalled();
    });

    it('moves focus into the search field when a mode tab is activated', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Home />);

        await user.click(screen.getByRole('tab', { name: 'Search by interest' }));

        // Focus is handed to SearchBar's input (via its focusInput handle) so a
        // screen-reader user lands in the field instead of on a silent tab.
        await waitFor(() => expect(focusInputSpy).toHaveBeenCalled());
    });
});

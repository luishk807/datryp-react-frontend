import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { WorldEventResult, WorldEventPlace } from 'api/worldEventApi';

let mockData: WorldEventResult | null | undefined;
let mockIsLoading = false;
let mockIsError = false;
vi.mock('api/hooks/useWorldEvent', () => ({
    useWorldEvent: () => ({
        data: mockData,
        isLoading: mockIsLoading,
        isError: mockIsError,
    }),
}));

// PlaceThumb resolves a fallback image via usePlaceImage; keep it offline.
vi.mock('api/hooks/usePlaceImage', () => ({
    usePlaceImage: () => ({ data: undefined }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

import WorldEvent from './index';

const place = (over: Partial<WorldEventPlace> = {}): WorldEventPlace => ({
    name: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    why: 'Best base for the event',
    imageUrl: 'http://img/kyoto.jpg',
    photographerName: null,
    photographerUrl: null,
    ...over,
});

const data = (): WorldEventResult => ({
    event: {
        name: 'World Expo 2026',
        startDate: '2026-06-11',
        endDate: '2026-06-14',
        hostCountry: 'France',
        description: 'A global gathering of innovation.',
        hype: 'The whole world will be watching.',
        imageUrl: 'http://img/expo.jpg',
        photographerName: null,
        photographerUrl: null,
    },
    places: [place(), place({ name: 'Osaka', countryCode: 'JP' })],
});

beforeEach(() => {
    mockData = undefined;
    mockIsLoading = false;
    mockIsError = false;
    mockNavigate.mockReset();
});

describe('WorldEvent', () => {
    it('shows a loading state', () => {
        mockIsLoading = true;
        renderWithProviders(<WorldEvent />);
        expect(screen.getByText('Upcoming event')).toBeInTheDocument();
    });

    it('renders nothing when there is no event (backend 204)', () => {
        mockData = null;
        const { container } = renderWithProviders(<WorldEvent />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing on error', () => {
        mockIsError = true;
        const { container } = renderWithProviders(<WorldEvent />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the event, its date range, host, hype and top spots', () => {
        mockData = data();
        renderWithProviders(<WorldEvent />);
        expect(
            screen.getByRole('heading', { name: 'World Expo 2026' })
        ).toBeInTheDocument();
        expect(screen.getByText(/Jun 11.*Jun 14/)).toBeInTheDocument();
        expect(screen.getByText('France')).toBeInTheDocument();
        expect(
            screen.getByText(/The whole world will be watching\./)
        ).toBeInTheDocument();
        expect(
            screen.getByText('A global gathering of innovation.')
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Top spots to be' })
        ).toBeInTheDocument();
    });

    it('exposes each top spot as a named button and navigates on click', async () => {
        mockData = data();
        renderWithProviders(<WorldEvent />);
        const btn = screen.getByRole('button', { name: /Open Kyoto, Japan/i });
        await userEvent.click(btn);
        expect(mockNavigate).toHaveBeenCalledWith(
            '/city?name=Kyoto&country=Japan&code=JP&mode=single'
        );
    });

    it('hides the host chip for an international event', () => {
        const base = data();
        mockData = { ...base, event: { ...base.event, hostCountry: 'International' } };
        renderWithProviders(<WorldEvent />);
        expect(screen.queryByText('International')).not.toBeInTheDocument();
    });
});

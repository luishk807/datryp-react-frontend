import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    fireEvent,
} from '../../test/renderWithProviders';
import type { MonthlyBestPlaceResult } from 'api/monthlyBestPlaceApi';

let mockUser: unknown = { name: 'Ana', isPaidMember: true };
let mockIsAdmin = false;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

let mockData: MonthlyBestPlaceResult | undefined;
let mockIsLoading = false;
let mockIsError = false;
vi.mock('api/hooks/useMonthlyBestPlace', () => ({
    useMonthlyBestPlace: () => ({
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

import MonthlyBestPlace from './index';

const data = (): MonthlyBestPlaceResult => ({
    monthKey: '2026-05',
    place: {
        name: 'Kyoto',
        country: 'Japan',
        countryCode: 'JP',
        tagline: 'Temples and tea houses',
        whyForYou: 'Perfect for your love of history and food.',
        imageUrl: null,
        photographerName: null,
        photographerUrl: null,
    },
    highlights: [
        { title: 'Fushimi Inari', description: 'Endless torii gates' },
        { title: 'Nishiki Market', description: 'Street food heaven' },
    ],
});

beforeEach(() => {
    mockUser = { name: 'Ana', isPaidMember: true };
    mockIsAdmin = false;
    mockData = undefined;
    mockIsLoading = false;
    mockIsError = false;
    mockNavigate.mockReset();
});

describe('MonthlyBestPlace', () => {
    it('renders nothing for signed-out users', () => {
        mockUser = null;
        const { container } = renderWithProviders(<MonthlyBestPlace />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing for free (non-Pro) users', () => {
        mockUser = { name: 'Ana', isPaidMember: false };
        const { container } = renderWithProviders(<MonthlyBestPlace />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders for an admin even without a paid plan', () => {
        mockUser = { name: 'Ana', isPaidMember: false };
        mockIsAdmin = true;
        mockData = data();
        renderWithProviders(<MonthlyBestPlace />);
        expect(
            screen.getByRole('heading', { name: 'Kyoto' })
        ).toBeInTheDocument();
    });

    it('shows a loading state for Pro users', () => {
        mockIsLoading = true;
        renderWithProviders(<MonthlyBestPlace />);
        expect(screen.getByText(/top pick this month/i)).toBeInTheDocument();
    });

    it('renders nothing on error', () => {
        mockIsError = true;
        const { container } = renderWithProviders(<MonthlyBestPlace />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the pick with its highlights and navigates on click', async () => {
        mockData = data();
        renderWithProviders(<MonthlyBestPlace />);
        expect(
            screen.getByRole('heading', { name: 'Kyoto' })
        ).toBeInTheDocument();
        expect(screen.getByText('Japan')).toBeInTheDocument();
        expect(screen.getByText(/Temples and tea houses/)).toBeInTheDocument();
        expect(
            screen.getByText('Perfect for your love of history and food.')
        ).toBeInTheDocument();
        expect(screen.getByText('Fushimi Inari')).toBeInTheDocument();
        expect(screen.getByText('Nishiki Market')).toBeInTheDocument();

        const card = screen.getByRole('link', { name: /Open Kyoto, Japan/i });
        await userEvent.click(card);
        expect(mockNavigate).toHaveBeenCalledWith(
            '/country?code=JP&mode=single&seed=monthly-best-place'
        );
    });

    it('is keyboard-operable via Enter on the card', () => {
        mockData = data();
        renderWithProviders(<MonthlyBestPlace />);
        const card = screen.getByRole('link', { name: /Open Kyoto, Japan/i });
        fireEvent.keyDown(card, { key: 'Enter' });
        expect(mockNavigate).toHaveBeenCalledWith(
            '/country?code=JP&mode=single&seed=monthly-best-place'
        );
    });
});

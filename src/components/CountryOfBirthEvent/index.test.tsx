import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type {
    CountryOfBirthEventResult,
    CountryOfBirthEventPlace,
} from 'api/countryOfBirthEventApi';

let mockData: CountryOfBirthEventResult | null | undefined;
let mockIsLoading = false;
let mockIsError = false;
vi.mock('api/hooks/useCountryOfBirthEvent', () => ({
    useCountryOfBirthEvent: () => ({
        data: mockData,
        isLoading: mockIsLoading,
        isError: mockIsError,
    }),
}));

vi.mock('api/hooks/usePlaceImage', () => ({
    usePlaceImage: () => ({ data: undefined }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

import CountryOfBirthEvent from './index';

const place = (
    over: Partial<CountryOfBirthEventPlace> = {}
): CountryOfBirthEventPlace => ({
    name: 'Rio de Janeiro',
    country: 'Brazil',
    countryCode: 'BR',
    why: 'Carnival central',
    imageUrl: 'http://img/rio.jpg',
    photographerName: null,
    photographerUrl: null,
    ...over,
});

const data = (): CountryOfBirthEventResult => ({
    event: {
        name: 'Rio Carnival',
        startDate: '2026-02-13',
        endDate: '2026-02-18',
        hostCountry: 'Brazil',
        description: 'The world’s biggest street party.',
        hype: 'Six days of samba and color.',
        imageUrl: 'http://img/carnival.jpg',
        photographerName: null,
        photographerUrl: null,
    },
    places: [place(), place({ name: 'Salvador', countryCode: 'BR' })],
});

beforeEach(() => {
    mockData = undefined;
    mockIsLoading = false;
    mockIsError = false;
    mockNavigate.mockReset();
});

describe('CountryOfBirthEvent', () => {
    it('renders nothing when the user has no matching event', () => {
        mockData = null;
        const { container } = renderWithProviders(<CountryOfBirthEvent />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing on error', () => {
        mockIsError = true;
        const { container } = renderWithProviders(<CountryOfBirthEvent />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows a loading state with the generic country eyebrow', () => {
        mockIsLoading = true;
        renderWithProviders(<CountryOfBirthEvent />);
        expect(
            screen.getByText('Coming up in your country')
        ).toBeInTheDocument();
    });

    it('renders the event with a country-named eyebrow and top spots', () => {
        mockData = data();
        renderWithProviders(<CountryOfBirthEvent />);
        expect(screen.getByText('Coming up in Brazil')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Rio Carnival' })
        ).toBeInTheDocument();
        expect(screen.getByText(/Feb 13.*Feb 18/)).toBeInTheDocument();
        expect(
            screen.getByText(/Six days of samba and color\./)
        ).toBeInTheDocument();
        expect(
            screen.getByText('The world’s biggest street party.')
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Top spots to be' })
        ).toBeInTheDocument();
    });

    it('exposes each top spot as a named button and navigates on click', async () => {
        mockData = data();
        renderWithProviders(<CountryOfBirthEvent />);
        const btn = screen.getByRole('button', {
            name: /Open Rio de Janeiro, Brazil/i,
        });
        await userEvent.click(btn);
        expect(mockNavigate).toHaveBeenCalledWith(
            '/city?name=Rio%20de%20Janeiro&country=Brazil&code=BR&mode=single'
        );
    });
});

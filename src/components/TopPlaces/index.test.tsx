import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

const mockRefetch = vi.fn();
let mockResult: {
    data: unknown;
    isLoading: boolean;
    isError: boolean;
    isFetching: boolean;
    refetch: typeof mockRefetch;
} = {
    data: undefined,
    isLoading: true,
    isError: false,
    isFetching: false,
    refetch: mockRefetch,
};
vi.mock('api/hooks/useMonthlyTopCities', () => ({
    useMonthlyTopCities: () => mockResult,
}));

import TopPlaces from './index';

const city = (over: Record<string, unknown> = {}) => ({
    name: 'Lisbon',
    country: 'Portugal',
    countryCode: 'PT',
    why: 'Sun and pastel de nata',
    imageUrl: 'https://img.example/lisbon.jpg',
    photographerName: null,
    photographerUrl: null,
    ...over,
});

const result = (cities: unknown[]) => ({
    month: '2026-05',
    cached: false,
    cities,
});

beforeEach(() => {
    mockResult = {
        data: undefined,
        isLoading: true,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
    };
});

describe('TopPlaces', () => {
    it('shows a titled, live skeleton grid while loading', () => {
        renderWithProviders(<TopPlaces onPlaceClick={vi.fn()} />);
        expect(
            screen.getByRole('heading', { name: /top 6 cities to travel/i })
        ).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('surfaces an alert with a working retry on error', async () => {
        mockResult = {
            data: undefined,
            isLoading: false,
            isError: true,
            isFetching: false,
            refetch: mockRefetch,
        };
        renderWithProviders(<TopPlaces onPlaceClick={vi.fn()} />);

        expect(screen.getByRole('alert')).toHaveTextContent(
            /couldn't load this month/i
        );
        await userEvent.click(
            screen.getByRole('button', { name: /try again/i })
        );
        expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('disables the retry button while re-fetching', () => {
        mockResult = {
            data: undefined,
            isLoading: false,
            isError: true,
            isFetching: true,
            refetch: mockRefetch,
        };
        renderWithProviders(<TopPlaces onPlaceClick={vi.fn()} />);
        expect(screen.getByRole('button', { name: /retrying/i })).toBeDisabled();
    });

    it('renders city cards with the month subtitle and fires onPlaceClick', async () => {
        mockResult = {
            data: result([city(), city({ name: 'Porto', countryCode: 'PT2' })]),
            isLoading: false,
            isError: false,
            isFetching: false,
            refetch: mockRefetch,
        };
        const onPlaceClick = vi.fn();
        renderWithProviders(<TopPlaces onPlaceClick={onPlaceClick} />);

        expect(screen.getByText(/curated for may 2026/i)).toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: 'Lisbon, Portugal' })
        ).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /Lisbon/i }));
        expect(onPlaceClick).toHaveBeenCalledTimes(1);
        expect(onPlaceClick.mock.calls[0][0]).toMatchObject({
            id: 'Lisbon--PT',
            name: 'Lisbon',
            country: 'Portugal',
        });
    });

    it('honors title/subtitle overrides', () => {
        mockResult = {
            data: result([city()]),
            isLoading: false,
            isError: false,
            isFetching: false,
            refetch: mockRefetch,
        };
        renderWithProviders(
            <TopPlaces
                onPlaceClick={vi.fn()}
                title="Hot right now"
                subtitle="Handpicked"
            />
        );
        expect(
            screen.getByRole('heading', { name: 'Hot right now' })
        ).toBeInTheDocument();
        expect(screen.getByText('Handpicked')).toBeInTheDocument();
    });
});

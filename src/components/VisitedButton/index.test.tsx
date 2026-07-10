import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { PlaceRecommendation } from 'types';

const mockMark = vi.fn();
const mockUnmark = vi.fn();
let mockVisitedItems: Array<{ placeKey: string }> = [];
let mockPending = false;

vi.mock('api/hooks/useVisitedPlaces', () => ({
    useVisitedPlaces: () => ({ data: { items: mockVisitedItems } }),
    useMarkVisited: () => ({ mutate: mockMark, isPending: mockPending }),
    useUnmarkVisited: () => ({ mutate: mockUnmark, isPending: false }),
}));

let mockUser: unknown = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

import VisitedButton from './index';

const place = {
    name: 'Louvre',
    city: 'Paris',
    country: 'France',
} as PlaceRecommendation;

const renderBtn = () =>
    renderWithProviders(
        <VisitedButton
            place={place}
            coordinates={{ lat: 48.8, lng: 2.3 }}
            visa={{ destinationCountryCode: 'FR' } as never}
        />
    );

beforeEach(() => {
    mockMark.mockReset();
    mockUnmark.mockReset();
    mockVisitedItems = [];
    mockPending = false;
    mockUser = { id: 'u1' };
});

describe('VisitedButton', () => {
    it('renders nothing for anonymous viewers', () => {
        mockUser = null;
        const { container } = renderBtn();
        expect(container).toBeEmptyDOMElement();
    });

    it('renders with an accessible mark-visited name', () => {
        renderBtn();
        expect(
            screen.getByRole('button', { name: 'Mark Louvre as visited' })
        ).toHaveAttribute('aria-pressed', 'false');
    });

    it('marks visited with coordinates + country code when un-visited', async () => {
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Mark Louvre as visited' })
        );
        expect(mockMark).toHaveBeenCalledWith(
            {
                placeName: 'Louvre',
                placeCity: 'Paris',
                placeCountry: 'France',
                countryCode: 'FR',
                latitude: 48.8,
                longitude: 2.3,
            },
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it('shows a marked-visited toast on success', async () => {
        mockMark.mockImplementation((_p, opts) => opts.onSuccess());
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Mark Louvre as visited' })
        );
        expect(
            await screen.findByText('Marked Louvre as visited')
        ).toBeInTheDocument();
    });

    it('reflects the visited state and unmarks on click', async () => {
        mockVisitedItems = [{ placeKey: 'louvre--paris--france' }];
        renderBtn();
        const btn = screen.getByRole('button', {
            name: 'Unmark Louvre as visited',
        });
        expect(btn).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(btn);
        expect(mockUnmark).toHaveBeenCalledWith(
            'louvre--paris--france',
            expect.any(Object)
        );
    });

    it('is disabled while pending', () => {
        mockPending = true;
        renderBtn();
        expect(
            screen.getByRole('button', { name: 'Mark Louvre as visited' })
        ).toBeDisabled();
    });
});

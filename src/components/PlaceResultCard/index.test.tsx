import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { PlaceRecommendation } from 'types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

// Keep the heavy share sheet (modal portal + email modal) out of these unit
// tests — a light stub is enough to prove the card's stop-propagation contract.
vi.mock('components/ShareButton', () => ({
    default: ({ title }: { title: string }) => (
        <button type="button" aria-label={`share ${title}`} />
    ),
}));

import PlaceResultCard from './index';

const place = (over: Partial<PlaceRecommendation> = {}): PlaceRecommendation => ({
    name: 'Eiffel Tower',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    rating: 4.5,
    bestTimeToVisit: 'May to October',
    description: 'An iron lattice landmark.',
    imageUrl: 'https://img.example/eiffel.jpg',
    photographerName: null,
    photographerUrl: null,
    latitude: 48.85,
    longitude: 2.29,
    ...over,
});

beforeEach(() => {
    mockNavigate.mockClear();
});

describe('PlaceResultCard', () => {
    it('renders name, location, rating, best time, description and image', () => {
        renderWithProviders(
            <PlaceResultCard place={place()} query="paris" index={0} />
        );
        expect(
            screen.getByRole('heading', { name: 'Eiffel Tower' })
        ).toBeInTheDocument();
        expect(screen.getByText('Paris · France')).toBeInTheDocument();
        expect(
            screen.getByLabelText('Rating 4.5 out of 5')
        ).toBeInTheDocument();
        expect(screen.getByText('4.5')).toBeInTheDocument();
        expect(screen.getByText('Best: May to October')).toBeInTheDocument();
        expect(
            screen.getByText('An iron lattice landmark.')
        ).toBeInTheDocument();
        const img = screen.getByRole('img', { name: 'Eiffel Tower' });
        expect(img).toHaveAttribute('src', 'https://img.example/eiffel.jpg');
    });

    it('is a keyboard-operable button that opens the deep-linked detail page', async () => {
        renderWithProviders(
            <PlaceResultCard place={place()} query="paris" index={2} />
        );
        const card = screen.getByRole('button', { name: 'Open Eiffel Tower' });

        await userEvent.click(card);
        expect(mockNavigate).toHaveBeenCalledWith('/place?q=paris&i=2');

        mockNavigate.mockClear();
        card.focus();
        await userEvent.keyboard('{Enter}');
        expect(mockNavigate).toHaveBeenCalledWith('/place?q=paris&i=2');
    });

    it('renders a labelled placeholder (no <img>) when there is no image', () => {
        const { container } = renderWithProviders(
            <PlaceResultCard
                place={place({ imageUrl: null })}
                query="paris"
                index={0}
            />
        );
        expect(container.querySelector('img')).toBeNull();
        expect(screen.getByRole('img', { name: 'Eiffel Tower' })).toBeInTheDocument();
    });

    it('renders Unsplash attribution and does not navigate when it is clicked', async () => {
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        renderWithProviders(
            <PlaceResultCard
                place={place({
                    photographerName: 'Ansel Adams',
                    photographerUrl: 'https://unsplash.com/@ansel',
                })}
                query="paris"
                index={0}
            />
        );
        expect(screen.getByText(/photo by/i)).toBeInTheDocument();
        const author = screen.getByRole('link', { name: 'Ansel Adams' });
        expect(author).toHaveAttribute('href', 'https://unsplash.com/@ansel');

        await userEvent.click(screen.getByRole('link', { name: 'Unsplash' }));
        expect(mockNavigate).not.toHaveBeenCalled();
        errSpy.mockRestore();
    });

    it('does not navigate when the share action is clicked', async () => {
        renderWithProviders(
            <PlaceResultCard place={place()} query="paris" index={0} />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'share Eiffel Tower' })
        );
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('clamps an out-of-range rating into the aria label', () => {
        renderWithProviders(
            <PlaceResultCard
                place={place({ rating: 9 })}
                query="paris"
                index={0}
            />
        );
        expect(screen.getByLabelText('Rating 5 out of 5')).toBeInTheDocument();
    });
});

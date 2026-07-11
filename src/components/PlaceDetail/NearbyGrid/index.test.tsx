import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { NearbyDestination } from 'types';

let mockPhoto: { imageUrl: string } | null | undefined;
vi.mock('api/hooks/usePlaceImage', () => ({
    usePlaceImage: () => ({ data: mockPhoto }),
}));

import NearbyGrid, { NearbyGridSkeleton } from './index';

const dest = (over: Partial<NearbyDestination> = {}): NearbyDestination => ({
    name: 'Nara',
    country: 'Japan',
    kind: 'city',
    why: 'Deer roam the ancient park.',
    lat: 34.6,
    lng: 135.8,
    ...over,
});

beforeEach(() => {
    mockPhoto = undefined;
});

describe('NearbyGrid', () => {
    it('renders one linked card per destination with meta and why', () => {
        renderWithProviders(<NearbyGrid items={[dest()]} />);
        const link = screen.getByRole('link', { name: /nara/i });
        expect(link).toHaveAttribute('href', '/place?q=Nara&i=0');
        expect(screen.getByText(/Japan · City/)).toBeInTheDocument();
        expect(
            screen.getByText('Deer roam the ancient park.')
        ).toBeInTheDocument();
    });

    it('caps the grid at four cards', () => {
        const items = Array.from({ length: 5 }).map((_, i) =>
            dest({ name: `Place ${i}` })
        );
        renderWithProviders(<NearbyGrid items={items} />);
        expect(screen.getAllByRole('listitem').length).toBe(4);
    });

    it('shows the compass fallback when no image is available', () => {
        const { container } = renderWithProviders(
            <NearbyGrid items={[dest()]} />
        );
        expect(
            container.querySelector('.nearby-grid-image-fallback')
        ).not.toBeNull();
        expect(container.querySelector('.nearby-grid-image img')).toBeNull();
    });

    it('paints the fetched fallback photo as a background when the row lacks one', () => {
        mockPhoto = { imageUrl: 'https://img.example/nara.jpg' };
        const { container } = renderWithProviders(
            <NearbyGrid items={[dest()]} />
        );
        const image = container.querySelector(
            '.nearby-grid-image'
        ) as HTMLElement;
        expect(image.style.backgroundImage).toContain(
            'https://img.example/nara.jpg'
        );
        expect(
            container.querySelector('.nearby-grid-image-fallback')
        ).toBeNull();
    });

    it('uses the row image directly when the destination already ships one', () => {
        const { container } = renderWithProviders(
            <NearbyGrid
                items={[dest({ imageUrl: 'https://row.example/nara.jpg' })]}
            />
        );
        const image = container.querySelector(
            '.nearby-grid-image'
        ) as HTMLElement;
        expect(image.style.backgroundImage).toContain(
            'https://row.example/nara.jpg'
        );
        expect(
            container.querySelector('.nearby-grid-image-fallback')
        ).toBeNull();
    });

    it('titlecases a lowercase kind and blanks an empty one', () => {
        renderWithProviders(
            <NearbyGrid items={[dest({ kind: 'REGION' })]} />
        );
        expect(screen.getByText(/Japan · Region/)).toBeInTheDocument();
    });
});

describe('NearbyGridSkeleton', () => {
    it('renders four placeholder cards', () => {
        const { container } = renderWithProviders(<NearbyGridSkeleton />);
        expect(
            container.querySelectorAll('.nearby-grid-item-skeleton').length
        ).toBe(4);
    });
});

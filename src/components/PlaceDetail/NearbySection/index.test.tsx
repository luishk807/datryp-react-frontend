import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { NearbyDestination } from 'types';

// NearbyGrid's cards lazy-fetch a fallback photo — keep that inert.
vi.mock('api/hooks/usePlaceImage', () => ({
    usePlaceImage: () => ({ data: undefined }),
}));

import NearbySection from './index';

const items: NearbyDestination[] = [
    {
        name: 'Osaka',
        country: 'Japan',
        kind: 'city',
        why: 'Street food capital.',
        lat: 34.7,
        lng: 135.5,
    },
];

describe('NearbySection', () => {
    it('renders nothing when the source query errored', () => {
        const { container } = renderWithProviders(
            <NearbySection items={items} isError />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the skeleton grid while loading', () => {
        const { container } = renderWithProviders(
            <NearbySection items={undefined} />
        );
        expect(
            screen.getByRole('heading', { name: /nearby — worth a side trip/i })
        ).toBeInTheDocument();
        expect(
            container.querySelectorAll('.nearby-grid-item-skeleton').length
        ).toBe(4);
    });

    it('renders the grid of destinations once resolved', () => {
        renderWithProviders(<NearbySection items={items} />);
        expect(
            screen.getByRole('link', { name: /osaka/i })
        ).toBeInTheDocument();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { BucketListItem } from 'types';

let mockData: BucketListItem[] | undefined = [];
vi.mock('api/hooks/useBucketList', () => ({
    useBucketList: () => ({ data: mockData }),
}));

import HomeBucketStrip from './index';

const item = (over: Partial<BucketListItem> = {}): BucketListItem =>
    ({
        id: 'b1',
        text: 'A goal',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        ...over,
    }) as BucketListItem;

beforeEach(() => {
    mockData = [];
});

describe('HomeBucketStrip', () => {
    it('renders nothing when the list is undefined', () => {
        mockData = undefined;
        const { container } = renderWithProviders(<HomeBucketStrip />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the list is empty', () => {
        mockData = [];
        const { container } = renderWithProviders(<HomeBucketStrip />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the title, total count and a "See all" link to the bucket page', () => {
        mockData = [
            item({ id: 'b1', text: 'Surf in Bali', emoji: '🏄' }),
            item({ id: 'b2', text: 'See the aurora' }),
        ];
        renderWithProviders(<HomeBucketStrip />);

        expect(
            screen.getByRole('heading', { name: /bucket list/i })
        ).toBeInTheDocument();
        // Count reflects the full list, not the capped chips.
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /see all/i })).toHaveAttribute(
            'href',
            '/bucket-list'
        );
    });

    it('renders each goal as a chip linking to the bucket page, preferring title over text', () => {
        mockData = [
            item({ id: 'b1', title: 'Dive the reef', text: 'raw text' }),
            item({ id: 'b2', text: 'Ride the Shinkansen' }),
        ];
        renderWithProviders(<HomeBucketStrip />);

        const dive = screen.getByRole('link', { name: 'Dive the reef' });
        expect(dive).toHaveAttribute('href', '/bucket-list');
        expect(
            screen.getByRole('link', { name: 'Ride the Shinkansen' })
        ).toBeInTheDocument();
        // The title wins — the raw text isn't shown for that row.
        expect(screen.queryByText('raw text')).not.toBeInTheDocument();
    });

    it('marks the chip emoji decorative (aria-hidden)', () => {
        mockData = [item({ id: 'b1', text: 'Surf in Bali', emoji: '🏄' })];
        renderWithProviders(<HomeBucketStrip />);
        expect(screen.getByText('🏄')).toHaveAttribute('aria-hidden', 'true');
    });

    it('caps the chips at 8 even when the list is longer', () => {
        mockData = Array.from({ length: 10 }, (_, i) =>
            item({ id: `b${i}`, text: `Goal ${i}` })
        );
        renderWithProviders(<HomeBucketStrip />);

        expect(screen.getByText('Goal 0')).toBeInTheDocument();
        expect(screen.getByText('Goal 7')).toBeInTheDocument();
        // 9th chip (index 8) and beyond are dropped.
        expect(screen.queryByText('Goal 8')).not.toBeInTheDocument();
        expect(screen.queryByText('Goal 9')).not.toBeInTheDocument();
        // Full count still shows.
        expect(screen.getByText('10')).toBeInTheDocument();
    });
});

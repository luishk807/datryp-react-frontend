import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { LodgingInfo, TravelBasics, NeighborhoodTips } from 'types';

import PracticalInfoSection from './index';

const basics: TravelBasics = {
    preferredTransport: 'Metro and walking',
    transportSystem: 'Extensive subway',
    paymentMethod: 'card',
    paymentNote: 'Cards accepted almost everywhere.',
    language: 'Japanese',
    vibe: 'Orderly and calm',
    audience: 'All travelers',
    ageRecommendation: 'All ages',
};

const lodging: LodgingInfo = {
    recommendedType: 'Ryokan',
    airbnbAvailability: 'common',
    airbnbNote: 'Many central options.',
    hotelAvailability: 'common',
    hotelNote: 'Business hotels abound.',
    priceRange: '$90–$200 / night',
    bookingTip: 'Book cherry-blossom season early.',
};

const neighborhoods: NeighborhoodTips = {
    best: ['Gion', 'Higashiyama'],
    avoid: ['The far industrial edge'],
};

describe('PracticalInfoSection', () => {
    it('renders nothing when the source query errored', () => {
        const { container } = renderWithProviders(
            <PracticalInfoSection basics={basics} lodging={lodging} isError />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders both labelled groups with basics and lodging values', () => {
        renderWithProviders(
            <PracticalInfoSection basics={basics} lodging={lodging} />
        );
        expect(
            screen.getByRole('heading', { name: /practical information/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Travel basics')).toBeInTheDocument();
        expect(screen.getByText('Where to stay')).toBeInTheDocument();
        expect(screen.getByText('Japanese')).toBeInTheDocument();
        expect(screen.getByText('Ryokan')).toBeInTheDocument();
    });

    it('renders skeletons while either payload is still loading', () => {
        const { container } = renderWithProviders(
            <PracticalInfoSection basics={undefined} lodging={undefined} />
        );
        // Subtitles still render; both row groups fall back to skeletons.
        expect(screen.getByText('Travel basics')).toBeInTheDocument();
        expect(screen.getByText('Where to stay')).toBeInTheDocument();
        expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    });

    it('renders the best and avoid neighborhood lists when provided', () => {
        renderWithProviders(
            <PracticalInfoSection
                basics={basics}
                lodging={lodging}
                neighborhoods={neighborhoods}
            />
        );
        expect(screen.getByText('Best areas to stay')).toBeInTheDocument();
        expect(screen.getByText('Gion')).toBeInTheDocument();
        expect(screen.getByText('Areas to avoid')).toBeInTheDocument();
        expect(
            screen.getByText('The far industrial edge')
        ).toBeInTheDocument();
    });

    it('omits the neighborhoods block when there are no areas', () => {
        const { container } = renderWithProviders(
            <PracticalInfoSection basics={basics} lodging={lodging} />
        );
        expect(
            container.querySelector('.practical-info-neighborhoods')
        ).toBeNull();
    });

    it('makes each neighborhood a tab stop named with its best/avoid context', () => {
        renderWithProviders(
            <PracticalInfoSection
                basics={basics}
                lodging={lodging}
                neighborhoods={neighborhoods}
            />
        );
        expect(
            screen.getByRole('listitem', { name: 'Best areas to stay: Gion' })
        ).toHaveAttribute('tabindex', '0');
        expect(
            screen.getByRole('listitem', {
                name: 'Areas to avoid: The far industrial edge',
            })
        ).toHaveAttribute('tabindex', '0');
        // The card's rows voice themselves, so the region announces only its
        // title — no whole-block aria-describedby (contentRead="items").
        expect(
            screen.getByRole('region', { name: /practical information/i })
        ).not.toHaveAttribute('aria-describedby');
    });

    it('names basics/lodging rows as focusable "label: value" groups (incl. node values)', () => {
        renderWithProviders(
            <PracticalInfoSection basics={basics} lodging={lodging} />
        );
        // String value row.
        expect(
            screen.getByRole('group', { name: 'Language: Japanese' })
        ).toHaveAttribute('tabindex', '0');
        // Node value rows read via their valueText override (payment / Airbnb).
        expect(
            screen.getByRole('group', {
                name: 'Payment: Cards widely accepted — Cards accepted almost everywhere.',
            })
        ).toHaveAttribute('tabindex', '0');
        expect(
            screen.getByRole('group', {
                name: 'Airbnb: Widely available — Many central options.',
            })
        ).toHaveAttribute('tabindex', '0');
    });
});

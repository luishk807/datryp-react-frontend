import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { EssentialAppsResult } from 'api/essentialAppsApi';

let mockData: EssentialAppsResult | null = null;
vi.mock('api/hooks/useEssentialApps', () => ({
    useEssentialApps: () => ({ data: mockData }),
}));

import EssentialAppsSection from './index';

const result = (
    over: Partial<EssentialAppsResult> = {}
): EssentialAppsResult => ({
    countryCode: 'JP',
    source: 'curated',
    intro: null,
    categories: [
        {
            key: 'ride_hailing',
            apps: [
                { name: 'Uber', note: 'Airports & big cities', status: 'essential' },
                { name: 'GO Taxi', note: null, status: null },
            ],
        },
        {
            key: 'payments',
            apps: [{ name: 'Suica', note: 'Tap to ride', status: 'essential' }],
        },
    ],
    ...over,
});

beforeEach(() => {
    mockData = null;
});

describe('EssentialAppsSection', () => {
    it('renders nothing when the payload is null', () => {
        mockData = null;
        const { container } = renderWithProviders(
            <EssentialAppsSection code="JP" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when there are no categories', () => {
        mockData = result({ categories: [] });
        const { container } = renderWithProviders(
            <EssentialAppsSection code="JP" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders category labels, apps, notes, and the approximate note', () => {
        mockData = result();
        renderWithProviders(<EssentialAppsSection code="JP" />);

        expect(
            screen.getByRole('heading', { name: 'Essential apps' })
        ).toBeInTheDocument();
        expect(screen.getByText('Getting around')).toBeInTheDocument();
        expect(screen.getByText('Paying')).toBeInTheDocument();
        expect(screen.getByText('Uber')).toBeInTheDocument();
        expect(screen.getByText('Airports & big cities')).toBeInTheDocument();
        expect(screen.getByText('Suica')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Approximate — app availability and popularity may vary by region. Verify before your trip.'
            )
        ).toBeInTheDocument();
    });

    it('falls back to the generic home note when intro is null', () => {
        mockData = result({ intro: null });
        renderWithProviders(<EssentialAppsSection code="JP" />);
        expect(
            screen.getByText(/the apps you rely on back home/i)
        ).toBeInTheDocument();
    });

    it('shows the country-specific intro when one is provided', () => {
        mockData = result({ intro: 'In Japan, cash is still king.' });
        renderWithProviders(<EssentialAppsSection code="JP" />);
        expect(
            screen.getByText('In Japan, cash is still king.')
        ).toBeInTheDocument();
    });
});

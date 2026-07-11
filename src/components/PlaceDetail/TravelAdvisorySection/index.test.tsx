import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { TravelAdvisory } from 'api/travelAdvisoryApi';

let mockSource: string | null = 'US';
let mockAdvisory: TravelAdvisory | undefined;
vi.mock('api/hooks/useTravelAdvisory', () => ({
    useResidenceCountry: () => mockSource,
    useTravelAdvisory: () => ({ data: mockAdvisory }),
}));

import TravelAdvisorySection from './index';

const advisory: TravelAdvisory = {
    sourceCode: 'US',
    sourceName: 'U.S. State Department',
    url: 'https://travel.state.gov/mexico',
    level: 2,
    label: 'Exercise increased caution',
    updated: 'Jul 2026',
};

beforeEach(() => {
    mockSource = 'US';
    mockAdvisory = undefined;
});

describe('TravelAdvisorySection', () => {
    it('renders nothing when there is no advisory for the pair', () => {
        const { container } = renderWithProviders(
            <TravelAdvisorySection destination="MX" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the source, level, label, review date, and official link', () => {
        mockAdvisory = advisory;
        renderWithProviders(<TravelAdvisorySection destination="MX" />);

        expect(
            screen.getByRole('heading', { name: /official travel advisory/i })
        ).toBeInTheDocument();
        expect(screen.getByText('U.S. State Department')).toBeInTheDocument();
        expect(screen.getByText('Level 2')).toBeInTheDocument();
        expect(screen.getByText('Exercise increased caution')).toBeInTheDocument();
        expect(
            screen.getByText(/reviewed Jul 2026/i)
        ).toBeInTheDocument();

        const link = screen.getByRole('link', {
            name: /read official advisory/i,
        });
        expect(link).toHaveAttribute('href', 'https://travel.state.gov/mexico');
        expect(link).toHaveAttribute('target', '_blank');
    });
});

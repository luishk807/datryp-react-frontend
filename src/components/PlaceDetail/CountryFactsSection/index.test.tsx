import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | null = null;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import CountryFactsSection from './index';

const facts = (
    over: Partial<CountryFactsResult> = {}
): Partial<CountryFactsResult> => ({
    emergency: { general: '112', police: '110' },
    power: { plugs: ['C', 'F'], voltage: 230, frequency: 50 },
    timezone: 'America/New_York',
    timezoneMulti: false,
    source: 'curated',
    ...over,
});

beforeEach(() => {
    mockFacts = null;
});

describe('CountryFactsSection', () => {
    it('renders nothing while the facts payload is unresolved', () => {
        mockFacts = null;
        const { container } = renderWithProviders(
            <CountryFactsSection code="US" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when emergency, power, and time are all empty', () => {
        mockFacts = facts({
            emergency: {},
            power: null,
            timezone: null,
        });
        const { container } = renderWithProviders(
            <CountryFactsSection code="US" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders emergency numbers, power spec, and the local-time row', () => {
        mockFacts = facts();
        renderWithProviders(<CountryFactsSection code="US" />);

        expect(
            screen.getByRole('heading', { name: 'Quick facts' })
        ).toBeInTheDocument();
        expect(screen.getByText('Emergency')).toBeInTheDocument();
        expect(screen.getByText('112')).toBeInTheDocument();
        expect(screen.getByText('All emergencies')).toBeInTheDocument();
        expect(screen.getByText('110')).toBeInTheDocument();
        expect(screen.getByText('Police')).toBeInTheDocument();
        expect(screen.getByText('Power')).toBeInTheDocument();
        expect(screen.getByText('Types C / F')).toBeInTheDocument();
        expect(screen.getByText('230V · 50Hz')).toBeInTheDocument();
        expect(screen.getByText('Local time')).toBeInTheDocument();
    });

    it('uses the singular plug label for a single plug type', () => {
        mockFacts = facts({
            power: { plugs: ['A'], voltage: 120, frequency: 60 },
        });
        renderWithProviders(<CountryFactsSection code="US" />);
        expect(screen.getByText('Type A')).toBeInTheDocument();
    });

    it('shows the multi-zone caveat when timezoneMulti is set', () => {
        mockFacts = facts({ timezoneMulti: true });
        renderWithProviders(<CountryFactsSection code="US" />);
        expect(
            screen.getByText("Capital's zone — the country spans several")
        ).toBeInTheDocument();
    });

    it('omits the approximate note for curated data', () => {
        mockFacts = facts({ source: 'curated' });
        renderWithProviders(<CountryFactsSection code="US" />);
        expect(screen.queryByText(/Approximate/i)).not.toBeInTheDocument();
    });

    it('shows the approximate note for AI-sourced data', () => {
        mockFacts = facts({ source: 'ai' });
        renderWithProviders(<CountryFactsSection code="ZZ" />);
        expect(
            screen.getByText(
                'Approximate — double-check the emergency numbers with an official local source.'
            )
        ).toBeInTheDocument();
    });
});

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { VisaInfo } from 'types';

vi.mock('components/PlaceDetail/VisaWidget', () => ({
    default: ({ visa }: { visa: VisaInfo }) => (
        <div data-testid="visa-widget">{visa.summary}</div>
    ),
}));

import VisaSection from './index';

const visa: VisaInfo = {
    destinationCountryCode: 'FR',
    visaFreeCountries: ['US'],
    visaOnArrivalCountries: [],
    summary: 'Most Western passports enter visa-free.',
};

describe('VisaSection', () => {
    it('renders nothing when the query errored', () => {
        const { container } = renderWithProviders(
            <VisaSection visa={undefined} isError />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the heading + a skeleton while the visa info is loading', () => {
        renderWithProviders(<VisaSection visa={undefined} />);
        expect(
            screen.getByRole('heading', { name: /visa/i })
        ).toBeInTheDocument();
        expect(screen.queryByTestId('visa-widget')).not.toBeInTheDocument();
    });

    it('renders the visa widget once the info resolves', () => {
        renderWithProviders(<VisaSection visa={visa} />);
        expect(screen.getByTestId('visa-widget')).toHaveTextContent(
            'Most Western passports enter visa-free.'
        );
    });
});

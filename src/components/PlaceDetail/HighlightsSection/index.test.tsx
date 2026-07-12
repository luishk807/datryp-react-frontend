import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import HighlightsSection from './index';

const baseProps = {
    city: 'Kyoto',
    country: 'Japan',
    cityHighlight: 'Temples and tea houses.',
    countryHighlight: 'Bullet trains and onsen.',
};

describe('HighlightsSection', () => {
    it('renders nothing when the source query errored', () => {
        const { container } = renderWithProviders(
            <HighlightsSection {...baseProps} isError />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the heading and both city and country rows', () => {
        renderWithProviders(<HighlightsSection {...baseProps} />);
        expect(
            screen.getByRole('heading', { name: /highlights/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Kyoto')).toBeInTheDocument();
        expect(screen.getByText('Japan')).toBeInTheDocument();
        expect(screen.getByText('Temples and tea houses.')).toBeInTheDocument();
        expect(
            screen.getByText('Bullet trains and onsen.')
        ).toBeInTheDocument();
    });

    it('shows a skeleton for a highlight that is still loading', () => {
        const { container } = renderWithProviders(
            <HighlightsSection
                {...baseProps}
                cityHighlight={undefined}
                countryHighlight={undefined}
            />
        );
        // Labels still render; the values fall back to shimmer bars.
        expect(screen.getByText('Kyoto')).toBeInTheDocument();
        expect(container.querySelectorAll('.skeleton').length).toBe(2);
    });

    it('makes each row a keyboard tab stop named "<place>: <highlight>"', () => {
        renderWithProviders(<HighlightsSection {...baseProps} />);
        expect(
            screen.getByLabelText('Kyoto: Temples and tea houses.')
        ).toHaveAttribute('tabindex', '0');
        expect(
            screen.getByLabelText('Japan: Bullet trains and onsen.')
        ).toHaveAttribute('tabindex', '0');
    });
});

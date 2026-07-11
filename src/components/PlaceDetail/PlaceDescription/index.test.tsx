import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import PlaceDescription from './index';

describe('PlaceDescription', () => {
    it('prefers the enriched long description when present', () => {
        renderWithProviders(
            <PlaceDescription
                longDescription="The enriched, richer copy."
                isError={false}
                fallbackDescription="Short cached blurb."
            />
        );
        expect(
            screen.getByText('The enriched, richer copy.')
        ).toBeInTheDocument();
        expect(
            screen.queryByText('Short cached blurb.')
        ).not.toBeInTheDocument();
    });

    it('shows the cached fallback immediately while the enriched copy loads', () => {
        renderWithProviders(
            <PlaceDescription
                longDescription={undefined}
                isError={false}
                fallbackDescription="Short cached blurb."
            />
        );
        expect(screen.getByText('Short cached blurb.')).toBeInTheDocument();
    });

    it('shows the cached fallback on error too', () => {
        renderWithProviders(
            <PlaceDescription
                longDescription={undefined}
                isError
                fallbackDescription="Short cached blurb."
            />
        );
        expect(screen.getByText('Short cached blurb.')).toBeInTheDocument();
    });

    it('renders nothing on error with no text at all', () => {
        const { container } = renderWithProviders(
            <PlaceDescription
                longDescription={undefined}
                isError
                fallbackDescription=""
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders a skeleton while loading with no fallback yet', () => {
        const { container } = renderWithProviders(
            <PlaceDescription
                longDescription={undefined}
                isError={false}
                fallbackDescription=""
            />
        );
        expect(container.querySelector('.paragraph-skeleton')).not.toBeNull();
    });
});

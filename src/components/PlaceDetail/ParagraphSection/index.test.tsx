import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import ParagraphSection from './index';

describe('ParagraphSection', () => {
    it('renders nothing when the source query errored', () => {
        const { container } = renderWithProviders(
            <ParagraphSection title="About Japan" description="text" isError />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the heading and the description paragraph', () => {
        renderWithProviders(
            <ParagraphSection
                title="About Japan"
                description="An archipelago of contrasts."
            />
        );
        expect(
            screen.getByRole('heading', { name: 'About Japan' })
        ).toBeInTheDocument();
        expect(
            screen.getByText('An archipelago of contrasts.')
        ).toBeInTheDocument();
    });

    it('renders a paragraph skeleton while the description is loading', () => {
        const { container } = renderWithProviders(
            <ParagraphSection title="About Japan" description={undefined} />
        );
        expect(
            screen.getByRole('heading', { name: 'About Japan' })
        ).toBeInTheDocument();
        expect(
            container.querySelector('.paragraph-skeleton')
        ).not.toBeNull();
    });
});

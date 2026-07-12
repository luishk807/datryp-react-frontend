import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import BeforeYouGoSection from './index';

describe('BeforeYouGoSection', () => {
    it('renders nothing when items are undefined', () => {
        const { container } = renderWithProviders(
            <BeforeYouGoSection items={undefined} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when every item is blank', () => {
        const { container } = renderWithProviders(
            <BeforeYouGoSection items={['   ', '']} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('trims, drops blanks, and lists the remaining checklist items', () => {
        renderWithProviders(
            <BeforeYouGoSection
                items={['  Sort out a visa  ', '', 'Bring a power adapter']}
            />
        );

        expect(
            screen.getByRole('heading', { name: 'Before you go' })
        ).toBeInTheDocument();
        expect(screen.getByText('Sort out a visa')).toBeInTheDocument();
        expect(screen.getByText('Bring a power adapter')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(
            screen.getByText(
                'A starting point — confirm the specifics for your dates and nationality.'
            )
        ).toBeInTheDocument();
    });
});

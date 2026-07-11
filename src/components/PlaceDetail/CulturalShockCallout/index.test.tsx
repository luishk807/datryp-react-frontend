import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import CulturalShockCallout from './index';

describe('CulturalShockCallout', () => {
    it('renders nothing while the text is loading (undefined)', () => {
        const { container } = renderWithProviders(
            <CulturalShockCallout text={undefined} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing for whitespace-only text', () => {
        const { container } = renderWithProviders(
            <CulturalShockCallout text="   " />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the note with the generic eyebrow and trimmed text', () => {
        renderWithProviders(
            <CulturalShockCallout text="  Silence on trains is the norm.  " />
        );

        const note = screen.getByRole('note');
        expect(note).toBeInTheDocument();
        expect(screen.getByText('Heads up')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Cultural shock' })
        ).toBeInTheDocument();
        expect(
            screen.getByText('Silence on trains is the norm.')
        ).toBeInTheDocument();
    });

    it('uses the subject-specific eyebrow when a label is given', () => {
        renderWithProviders(
            <CulturalShockCallout
                text="Bowing replaces handshakes."
                subjectLabel="Tokyo"
            />
        );
        expect(screen.getByText('Heads up about Tokyo')).toBeInTheDocument();
    });
});

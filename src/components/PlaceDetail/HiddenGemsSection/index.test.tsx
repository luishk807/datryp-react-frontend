import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { HiddenGem } from 'types';
import HiddenGemsSection from './index';

const gem = (over: Partial<HiddenGem> = {}): HiddenGem => ({
    name: 'Secret Cove',
    why: 'A quiet beach the tour buses skip.',
    ...over,
});

describe('HiddenGemsSection', () => {
    it('renders nothing when items are undefined', () => {
        const { container } = renderWithProviders(
            <HiddenGemsSection items={undefined} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the list is empty', () => {
        const { container } = renderWithProviders(
            <HiddenGemsSection items={[]} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when every gem name is blank', () => {
        const { container } = renderWithProviders(
            <HiddenGemsSection items={[gem({ name: '   ' })]} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the heading and each gem with its name and why', () => {
        renderWithProviders(
            <HiddenGemsSection
                items={[
                    gem(),
                    gem({ name: 'Old Mill', why: 'Sunset views for locals.' }),
                ]}
            />
        );
        expect(
            screen.getByRole('heading', { name: /hidden gems/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Secret Cove')).toBeInTheDocument();
        expect(
            screen.getByText('A quiet beach the tour buses skip.')
        ).toBeInTheDocument();
        expect(screen.getByText('Old Mill')).toBeInTheDocument();
    });

    it('omits the why line when it is blank', () => {
        renderWithProviders(
            <HiddenGemsSection items={[gem({ name: 'Lone Pier', why: '  ' })]} />
        );
        expect(screen.getByText('Lone Pier')).toBeInTheDocument();
        expect(
            screen.queryByText('A quiet beach the tour buses skip.')
        ).not.toBeInTheDocument();
    });

    it('makes each gem a keyboard tab stop that voices its full text', () => {
        renderWithProviders(
            <HiddenGemsSection
                items={[
                    gem({
                        name: 'The High Line',
                        why: 'An elevated park on an old railway.',
                    }),
                    gem({ name: 'Roosevelt Island', why: 'A quiet escape.' }),
                ]}
            />
        );

        // Each gem is its own tab stop (so Tab walks through them) and carries
        // an accessible name of "<name>. <why>" — screen readers announce the
        // whole pick on focus, not just the card title.
        const highLine = screen.getByRole('listitem', {
            name: 'The High Line. An elevated park on an old railway.',
        });
        expect(highLine).toHaveAttribute('tabindex', '0');
        expect(
            screen.getByRole('listitem', {
                name: 'Roosevelt Island. A quiet escape.',
            })
        ).toHaveAttribute('tabindex', '0');
    });

    it('names a why-less gem by its name alone', () => {
        renderWithProviders(
            <HiddenGemsSection items={[gem({ name: 'Lone Pier', why: '  ' })]} />
        );
        expect(
            screen.getByRole('listitem', { name: 'Lone Pier' })
        ).toHaveAttribute('tabindex', '0');
    });
});

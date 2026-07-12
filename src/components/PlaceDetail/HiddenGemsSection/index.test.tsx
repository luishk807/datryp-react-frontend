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

    it('renders the gems as a plain semantic list (no tab stops)', () => {
        renderWithProviders(
            <HiddenGemsSection items={[gem(), gem({ name: 'Old Mill' })]} />
        );
        // Informational list: real <li>s read in browse mode, NOT tab stops.
        const items = screen.getAllByRole('listitem');
        expect(items.length).toBe(2);
        items.forEach((li) => expect(li).not.toHaveAttribute('tabindex'));
    });
});

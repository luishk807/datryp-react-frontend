import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { NamedTip } from 'types';
import NotesSection from './index';

const items: NamedTip[] = [
    { name: 'Cash is king', why: 'Small shops rarely take cards.' },
    { name: 'Quiet trains', why: 'Phone calls are frowned upon.' },
];

describe('NotesSection', () => {
    it('renders nothing when the source query errored', () => {
        const { container } = renderWithProviders(
            <NotesSection items={items} isError />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the skeleton list while loading', () => {
        const { container } = renderWithProviders(
            <NotesSection items={undefined} />
        );
        expect(
            screen.getByRole('heading', { name: /good to know/i })
        ).toBeInTheDocument();
        expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    });

    it('renders each note once resolved', () => {
        renderWithProviders(<NotesSection items={items} />);
        expect(
            screen.getByRole('heading', { name: /good to know/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Cash is king')).toBeInTheDocument();
        expect(
            screen.getByText('Small shops rarely take cards.')
        ).toBeInTheDocument();
        expect(screen.getByText('Quiet trains')).toBeInTheDocument();
    });
});

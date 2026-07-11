import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { NamedTip } from 'types';
import MustDoList, { MustDoListSkeleton } from './index';

const items: NamedTip[] = [
    { name: 'Climb the tower', why: 'Best panorama in town.' },
    { name: 'Try the night market', why: 'Cheap eats after dark.' },
];

describe('MustDoList', () => {
    it('renders nothing for an empty list', () => {
        const { container } = renderWithProviders(<MustDoList items={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the list with an accessible name and each item', () => {
        renderWithProviders(<MustDoList items={items} />);
        expect(
            screen.getByRole('list', {
                name: /things you shouldn't leave without doing/i,
            })
        ).toBeInTheDocument();
        expect(screen.getByText('Climb the tower')).toBeInTheDocument();
        expect(screen.getByText('Best panorama in town.')).toBeInTheDocument();
        expect(screen.getByText('Try the night market')).toBeInTheDocument();
    });
});

describe('MustDoListSkeleton', () => {
    it('renders the requested number of placeholder rows', () => {
        const { container } = renderWithProviders(
            <MustDoListSkeleton rows={3} />
        );
        expect(container.querySelectorAll('.must-do-item').length).toBe(3);
    });
});

import { describe, it, expect } from 'vitest';
import {
    renderWithProviders,
    screen,
} from '../../../test/renderWithProviders';
import AvatarStack from './index';

describe('AvatarStack', () => {
    it('renders nothing when there are no people', () => {
        const { container } = renderWithProviders(<AvatarStack people={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders a decorative photo avatar with empty alt', () => {
        const { container } = renderWithProviders(
            <AvatarStack
                people={[{ id: 1, name: 'Ada Lovelace', imageUrl: 'a.jpg' }]}
            />
        );
        const img = container.querySelector('img');
        expect(img).toHaveAttribute('src', 'a.jpg');
        expect(img).toHaveAttribute('alt', '');
    });

    it('falls back to initials from first+last name', () => {
        renderWithProviders(<AvatarStack people={[{ name: 'John Doe' }]} />);
        expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('uses a single initial for a one-word name', () => {
        renderWithProviders(<AvatarStack people={[{ name: 'Madonna' }]} />);
        expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('shows "?" for a blank name', () => {
        renderWithProviders(<AvatarStack people={[{ name: '   ' }]} />);
        expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('collapses people beyond max into a "+N" overflow bubble', () => {
        const people = ['A B', 'C D', 'E F', 'G H', 'I J'].map((name) => ({
            name,
        }));
        renderWithProviders(<AvatarStack people={people} max={3} />);
        expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('hides the overflow bubble when showOverflow is false', () => {
        const people = ['A B', 'C D', 'E F', 'G H'].map((name) => ({ name }));
        renderWithProviders(
            <AvatarStack people={people} max={2} showOverflow={false} />
        );
        expect(screen.queryByText('+2')).not.toBeInTheDocument();
    });

    it('applies the size variant class', () => {
        const { container } = renderWithProviders(
            <AvatarStack people={[{ name: 'A B' }]} size="md" />
        );
        expect(container.querySelector('.avatar-stack')).toHaveClass('size-md');
    });

    it('hides the whole stack from the accessibility tree', () => {
        const { container } = renderWithProviders(
            <AvatarStack people={[{ name: 'A B' }]} />
        );
        expect(container.querySelector('.avatar-stack')).toHaveAttribute(
            'aria-hidden',
            'true'
        );
    });
});

import { describe, it, expect } from 'vitest';
import {
    renderWithProviders,
    screen,
    within,
} from '../../../test/renderWithProviders';
import type { NamedTip } from 'types';
import TipList from './index';

const tips: NamedTip[] = [
    { name: 'Senso-ji Temple', why: "Tokyo's oldest temple" },
    { name: 'Tsukiji Market', why: 'Fresh sushi breakfast' },
];

describe('TipList', () => {
    it('renders a row per tip with its name and reason', () => {
        renderWithProviders(<TipList items={tips} />);
        const rows = screen.getAllByRole('listitem');
        expect(rows).toHaveLength(2);
        expect(within(rows[0]).getByText('Senso-ji Temple')).toBeInTheDocument();
        expect(
            within(rows[0]).getByText("Tokyo's oldest temple")
        ).toBeInTheDocument();
    });

    it('defaults to the md density and honours the sm variant', () => {
        const { container, rerender } = renderWithProviders(
            <TipList items={tips} />
        );
        expect(container.querySelector('.tip-list.size-md')).toBeInTheDocument();
        rerender(<TipList items={tips} size="sm" />);
        expect(container.querySelector('.tip-list.size-sm')).toBeInTheDocument();
    });

    it('renders an empty list when there are no tips', () => {
        renderWithProviders(<TipList items={[]} />);
        expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
});

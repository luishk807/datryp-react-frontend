import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../../../test/renderWithProviders';
import TipListSkeleton from './index';

describe('TipListSkeleton', () => {
    it('renders five placeholder rows by default at md density', () => {
        const { container } = renderWithProviders(<TipListSkeleton />);
        expect(container.querySelector('.tip-list.size-md')).toBeInTheDocument();
        expect(container.querySelectorAll('.tip-list-item')).toHaveLength(5);
    });

    it('honours a custom row count and the sm density', () => {
        const { container } = renderWithProviders(
            <TipListSkeleton rows={3} size="sm" />
        );
        expect(container.querySelector('.tip-list.size-sm')).toBeInTheDocument();
        expect(container.querySelectorAll('.tip-list-item')).toHaveLength(3);
    });
});

import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../../../test/renderWithProviders';
import ParagraphSkeleton from './index';

describe('ParagraphSkeleton', () => {
    it('renders two shimmer bars by default', () => {
        const { container } = renderWithProviders(<ParagraphSkeleton />);
        expect(container.querySelectorAll('.skeleton')).toHaveLength(2);
    });

    it('renders the requested number of lines', () => {
        const { container } = renderWithProviders(
            <ParagraphSkeleton lines={4} />
        );
        expect(container.querySelectorAll('.skeleton')).toHaveLength(4);
    });

    it('truncates the final line to 70% so it reads like real text', () => {
        const { container } = renderWithProviders(
            <ParagraphSkeleton lines={3} />
        );
        const bars = Array.from(
            container.querySelectorAll<HTMLElement>('.skeleton')
        );
        expect(bars[0].style.width).toBe('100%');
        expect(bars[bars.length - 1].style.width).toBe('70%');
    });

    it('renders a single 70%-width bar for lines=1', () => {
        const { container } = renderWithProviders(
            <ParagraphSkeleton lines={1} />
        );
        const bars = container.querySelectorAll<HTMLElement>('.skeleton');
        expect(bars).toHaveLength(1);
        expect(bars[0].style.width).toBe('70%');
    });
});

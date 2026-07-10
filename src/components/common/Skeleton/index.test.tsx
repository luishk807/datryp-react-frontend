import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../../../test/renderWithProviders';
import Skeleton from './index';

describe('Skeleton', () => {
    it('renders a decorative shimmer span', () => {
        const { container } = renderWithProviders(<Skeleton />);
        const bar = container.querySelector('.skeleton') as HTMLElement;
        expect(bar).toBeInTheDocument();
        expect(bar).toHaveAttribute('aria-hidden', 'true');
    });

    it('converts numeric width/height/radius to px', () => {
        const { container } = renderWithProviders(
            <Skeleton width={120} height={16} radius={8} />
        );
        const bar = container.querySelector('.skeleton') as HTMLElement;
        expect(bar.style.width).toBe('120px');
        expect(bar.style.height).toBe('16px');
        expect(bar.style.borderRadius).toBe('8px');
    });

    it('passes string sizes through unchanged', () => {
        const { container } = renderWithProviders(
            <Skeleton width="50%" radius="50%" />
        );
        const bar = container.querySelector('.skeleton') as HTMLElement;
        expect(bar.style.width).toBe('50%');
        expect(bar.style.borderRadius).toBe('50%');
    });

    it('applies a passed className alongside the base class', () => {
        const { container } = renderWithProviders(
            <Skeleton className="hero-bar" />
        );
        const bar = container.querySelector('.skeleton') as HTMLElement;
        expect(bar).toHaveClass('hero-bar');
    });
});

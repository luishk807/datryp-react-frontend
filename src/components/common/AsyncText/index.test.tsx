import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import AsyncText from './index';

describe('AsyncText', () => {
    it('renders the resolved value', () => {
        renderWithProviders(<AsyncText value="Barcelona" />);
        expect(screen.getByText('Barcelona')).toBeInTheDocument();
    });

    it('renders a falsy-but-present value like 0', () => {
        renderWithProviders(<AsyncText value={0} />);
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('shows a shimmer skeleton while the value is unresolved', () => {
        const { container } = renderWithProviders(<AsyncText value={null} />);
        expect(container.querySelector('.skeleton')).toBeInTheDocument();
    });

    it('forwards the skeleton width/height props', () => {
        const { container } = renderWithProviders(
            <AsyncText value={undefined} skeletonWidth="50%" skeletonHeight={20} />
        );
        const bar = container.querySelector('.skeleton') as HTMLElement;
        expect(bar.style.width).toBe('50%');
        expect(bar.style.height).toBe('20px');
    });

    it('renders the error fallback instead of the skeleton when isError', () => {
        renderWithProviders(
            <AsyncText value={null} isError errorFallback="Unavailable" />
        );
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });

    it('renders nothing on error with the default (null) fallback', () => {
        const { container } = renderWithProviders(
            <AsyncText value={undefined} isError />
        );
        expect(container).toBeEmptyDOMElement();
    });
});

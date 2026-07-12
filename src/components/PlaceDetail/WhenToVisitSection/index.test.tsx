import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import WhenToVisitSection from './index';

describe('WhenToVisitSection', () => {
    it('shows both best and worst times once resolved', () => {
        renderWithProviders(
            <WhenToVisitSection
                bestTime="Apr–May"
                worstTime="Jul–Aug"
                isError={false}
            />
        );
        expect(
            screen.getByRole('heading', { name: /when to visit/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Best')).toBeInTheDocument();
        expect(screen.getByText('Worst')).toBeInTheDocument();
        expect(screen.getByText('Apr–May')).toBeInTheDocument();
        expect(screen.getByText('Jul–Aug')).toBeInTheDocument();
    });

    it('keeps the best row (and a shimmer) while the worst time is loading', () => {
        const { container } = renderWithProviders(
            <WhenToVisitSection
                bestTime="Apr–May"
                worstTime={undefined}
                isError={false}
            />
        );
        expect(screen.getByText('Apr–May')).toBeInTheDocument();
        expect(container.querySelector('.skeleton')).toBeInTheDocument();
    });

    it('falls back to an em-dash for the worst time on error', () => {
        renderWithProviders(
            <WhenToVisitSection bestTime="Apr–May" worstTime={undefined} isError />
        );
        expect(screen.getByText('Apr–May')).toBeInTheDocument();
        expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('makes each row a keyboard tab stop named "<label>: <value>"', () => {
        renderWithProviders(
            <WhenToVisitSection
                bestTime="Apr–May"
                worstTime="Jul–Aug"
                isError={false}
            />
        );
        expect(screen.getByLabelText('Best: Apr–May')).toHaveAttribute(
            'tabindex',
            '0'
        );
        expect(screen.getByLabelText('Worst: Jul–Aug')).toHaveAttribute(
            'tabindex',
            '0'
        );
    });
});

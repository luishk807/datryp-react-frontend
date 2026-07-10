import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import Pagination from './index';

describe('Pagination', () => {
    it('renders nothing when there is a single page or fewer', () => {
        const { container } = renderWithProviders(
            <Pagination page={1} totalPages={1} onPageChange={() => {}} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders a labelled nav landmark with numbered pages', () => {
        renderWithProviders(
            <Pagination page={1} totalPages={5} onPageChange={() => {}} />
        );
        expect(
            screen.getByRole('navigation', { name: 'Pagination' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /go to page 2/i })
        ).toBeInTheDocument();
    });

    it('calls onPageChange with the clicked page number', async () => {
        const onPageChange = vi.fn();
        renderWithProviders(
            <Pagination page={1} totalPages={5} onPageChange={onPageChange} />
        );
        await userEvent.click(
            screen.getByRole('button', { name: /go to page 3/i })
        );
        expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('forwards a custom nav aria-label', () => {
        renderWithProviders(
            <Pagination
                page={2}
                totalPages={4}
                onPageChange={() => {}}
                ariaLabel="Reviews pages"
            />
        );
        expect(
            screen.getByRole('navigation', { name: 'Reviews pages' })
        ).toBeInTheDocument();
    });
});

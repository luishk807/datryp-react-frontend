import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../test/renderWithProviders';
import VisitedMenu from './index';

const counts = { countries: 3, cities: 5, places: 8 };

describe('VisitedMenu', () => {
    it('renders a labelled nav with the three category tabs and counts', () => {
        renderWithProviders(
            <VisitedMenu active="countries" onChange={() => {}} counts={counts} />
        );
        expect(
            screen.getByRole('navigation', { name: /visited categories/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /countries/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /cities/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /places/i })
        ).toBeInTheDocument();
        // Counts render alongside the labels.
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('marks the active tab with aria-current', () => {
        renderWithProviders(
            <VisitedMenu active="cities" onChange={() => {}} counts={counts} />
        );
        expect(
            screen.getByRole('button', { name: /cities/i })
        ).toHaveAttribute('aria-current', 'page');
        expect(
            screen.getByRole('button', { name: /countries/i })
        ).not.toHaveAttribute('aria-current');
    });

    it('calls onChange with the tab key when a tab is clicked', async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <VisitedMenu active="countries" onChange={onChange} counts={counts} />
        );
        await userEvent.click(screen.getByRole('button', { name: /places/i }));
        expect(onChange).toHaveBeenCalledWith('places');
    });
});

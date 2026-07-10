import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

const mockMark = vi.fn();
const mockUnmark = vi.fn();
let mockVisitedItems: Array<{ citySlug: string }> = [];
let mockPending = false;

vi.mock('api/hooks/useVisitedCities', () => ({
    useVisitedCities: () => ({ data: { items: mockVisitedItems } }),
    useMarkVisitedCity: () => ({ mutate: mockMark, isPending: mockPending }),
    useUnmarkVisitedCity: () => ({ mutate: mockUnmark, isPending: false }),
}));

let mockUser: unknown = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

import VisitedCityButton from './index';

const renderBtn = () =>
    renderWithProviders(
        <VisitedCityButton
            cityName="Kyoto"
            countryName="Japan"
            countryCode="JP"
        />
    );

beforeEach(() => {
    mockMark.mockReset();
    mockUnmark.mockReset();
    mockVisitedItems = [];
    mockPending = false;
    mockUser = { id: 'u1' };
});

describe('VisitedCityButton', () => {
    it('renders nothing for anonymous viewers', () => {
        mockUser = null;
        const { container } = renderBtn();
        expect(container).toBeEmptyDOMElement();
    });

    it('renders with an accessible mark-visited name', () => {
        renderBtn();
        expect(
            screen.getByRole('button', { name: 'Mark Kyoto as visited' })
        ).toHaveAttribute('aria-pressed', 'false');
    });

    it('marks the city visited with its payload when un-visited', async () => {
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Mark Kyoto as visited' })
        );
        expect(mockMark).toHaveBeenCalledWith(
            { name: 'Kyoto', country: 'Japan', code: 'JP' },
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it('shows a marked-visited toast on success', async () => {
        mockMark.mockImplementation((_p, opts) => opts.onSuccess());
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Mark Kyoto as visited' })
        );
        expect(
            await screen.findByText('Marked Kyoto as visited')
        ).toBeInTheDocument();
    });

    it('matches the slugified city and unmarks when already visited', async () => {
        mockVisitedItems = [{ citySlug: 'kyoto--jp' }];
        renderBtn();
        const btn = screen.getByRole('button', {
            name: 'Unmark Kyoto as visited',
        });
        expect(btn).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(btn);
        expect(mockUnmark).toHaveBeenCalledWith(
            'kyoto--jp',
            expect.any(Object)
        );
    });

    it('is disabled while pending', () => {
        mockPending = true;
        renderBtn();
        expect(
            screen.getByRole('button', { name: 'Mark Kyoto as visited' })
        ).toBeDisabled();
    });
});

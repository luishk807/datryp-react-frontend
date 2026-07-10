import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

const mockMark = vi.fn();
const mockUnmark = vi.fn();
let mockVisitedItems: Array<{ countryCode: string }> = [];
let mockPending = false;

vi.mock('api/hooks/useVisitedCountries', () => ({
    useVisitedCountries: () => ({ data: { items: mockVisitedItems } }),
    useMarkVisitedCountry: () => ({ mutate: mockMark, isPending: mockPending }),
    useUnmarkVisitedCountry: () => ({ mutate: mockUnmark, isPending: false }),
}));

let mockUser: unknown = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

import VisitedCountryButton from './index';

const renderBtn = () =>
    renderWithProviders(
        <VisitedCountryButton countryCode="jp" countryName="Japan" />
    );

beforeEach(() => {
    mockMark.mockReset();
    mockUnmark.mockReset();
    mockVisitedItems = [];
    mockPending = false;
    mockUser = { id: 'u1' };
});

describe('VisitedCountryButton', () => {
    it('renders nothing for anonymous viewers', () => {
        mockUser = null;
        const { container } = renderBtn();
        expect(container).toBeEmptyDOMElement();
    });

    it('renders with an accessible mark-visited name', () => {
        renderBtn();
        expect(
            screen.getByRole('button', { name: 'Mark Japan as visited' })
        ).toHaveAttribute('aria-pressed', 'false');
    });

    it('marks the country visited with the upper-cased code when un-visited', async () => {
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Mark Japan as visited' })
        );
        expect(mockMark).toHaveBeenCalledWith(
            'JP',
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it('shows a marked-visited toast on success', async () => {
        mockMark.mockImplementation((_c, opts) => opts.onSuccess());
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Mark Japan as visited' })
        );
        expect(
            await screen.findByText('Marked Japan as visited')
        ).toBeInTheDocument();
    });

    it('reflects the visited state (case-insensitive code) and unmarks on click', async () => {
        mockVisitedItems = [{ countryCode: 'jp' }];
        renderBtn();
        const btn = screen.getByRole('button', {
            name: 'Unmark Japan as visited',
        });
        expect(btn).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(btn);
        expect(mockUnmark).toHaveBeenCalledWith('JP', expect.any(Object));
    });

    it('is disabled while pending', () => {
        mockPending = true;
        renderBtn();
        expect(
            screen.getByRole('button', { name: 'Mark Japan as visited' })
        ).toBeDisabled();
    });
});

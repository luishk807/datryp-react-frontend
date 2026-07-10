import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

const mockSaveCity = vi.fn();
const mockUnsaveCity = vi.fn();
let mockSavedItems: Array<{ citySlug: string }> = [];
let mockPending = false;

vi.mock('api/hooks/useSavedCities', () => ({
    useSavedCities: () => ({ data: { items: mockSavedItems } }),
    useSaveCity: () => ({ mutate: mockSaveCity, isPending: mockPending }),
    useUnsaveCity: () => ({ mutate: mockUnsaveCity, isPending: false }),
}));

let mockUser: unknown = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

import BookmarkCityButton from './index';

const renderBtn = () =>
    renderWithProviders(
        <BookmarkCityButton
            cityName="Kyoto"
            countryName="Japan"
            countryCode="JP"
            imageUrl="http://img"
        />
    );

beforeEach(() => {
    mockSaveCity.mockReset();
    mockUnsaveCity.mockReset();
    mockNavigate.mockReset();
    mockSavedItems = [];
    mockPending = false;
    mockUser = { id: 'u1' };
});

describe('BookmarkCityButton', () => {
    it('renders with an accessible save name', () => {
        renderBtn();
        expect(
            screen.getByRole('button', { name: 'Save Kyoto to bookmarks' })
        ).toHaveAttribute('aria-pressed', 'false');
    });

    it('saves the city payload when signed-in and un-saved', async () => {
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Kyoto to bookmarks' })
        );
        expect(mockSaveCity).toHaveBeenCalledWith(
            {
                name: 'Kyoto',
                country: 'Japan',
                code: 'JP',
                imageUrl: 'http://img',
            },
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it('shows a save-success toast', async () => {
        mockSaveCity.mockImplementation((_p, opts) => opts.onSuccess());
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Kyoto to bookmarks' })
        );
        expect(
            await screen.findByText('Saved Kyoto to your bookmarks')
        ).toBeInTheDocument();
    });

    it('matches the slugified city and removes when already saved', async () => {
        mockSavedItems = [{ citySlug: 'kyoto--jp' }];
        renderBtn();
        const btn = screen.getByRole('button', {
            name: 'Remove Kyoto from bookmarks',
        });
        expect(btn).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(btn);
        expect(mockUnsaveCity).toHaveBeenCalledWith(
            'kyoto--jp',
            expect.any(Object)
        );
    });

    it('routes anonymous users to the gated route', async () => {
        mockUser = null;
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Kyoto to bookmarks' })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/single');
        expect(mockSaveCity).not.toHaveBeenCalled();
    });

    it('is disabled while pending', () => {
        mockPending = true;
        renderBtn();
        expect(
            screen.getByRole('button', { name: 'Save Kyoto to bookmarks' })
        ).toBeDisabled();
    });
});

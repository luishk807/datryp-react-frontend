import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

const mockSaveCountry = vi.fn();
const mockUnsaveCountry = vi.fn();
let mockSavedItems: Array<{ countryCode: string }> = [];
let mockPending = false;

vi.mock('api/hooks/useSavedCountries', () => ({
    useSavedCountries: () => ({ data: { items: mockSavedItems } }),
    useSaveCountry: () => ({ mutate: mockSaveCountry, isPending: mockPending }),
    useUnsaveCountry: () => ({ mutate: mockUnsaveCountry, isPending: false }),
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

import BookmarkCountryButton from './index';

const renderBtn = () =>
    renderWithProviders(
        <BookmarkCountryButton countryCode="jp" countryName="Japan" />
    );

beforeEach(() => {
    mockSaveCountry.mockReset();
    mockUnsaveCountry.mockReset();
    mockNavigate.mockReset();
    mockSavedItems = [];
    mockPending = false;
    mockUser = { id: 'u1' };
});

describe('BookmarkCountryButton', () => {
    it('renders with an accessible save name', () => {
        renderBtn();
        expect(
            screen.getByRole('button', { name: 'Save Japan to bookmarks' })
        ).toHaveAttribute('aria-pressed', 'false');
    });

    it('saves the normalized (upper-cased) country code when un-saved', async () => {
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Japan to bookmarks' })
        );
        expect(mockSaveCountry).toHaveBeenCalledWith(
            'JP',
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it('shows a save-success toast', async () => {
        mockSaveCountry.mockImplementation((_c, opts) => opts.onSuccess());
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Japan to bookmarks' })
        );
        expect(
            await screen.findByText('Saved Japan to your bookmarks')
        ).toBeInTheDocument();
    });

    it('reflects the saved state (code match) and removes on click', async () => {
        mockSavedItems = [{ countryCode: 'JP' }];
        renderBtn();
        const btn = screen.getByRole('button', {
            name: 'Remove Japan from bookmarks',
        });
        expect(btn).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(btn);
        expect(mockUnsaveCountry).toHaveBeenCalledWith(
            'JP',
            expect.any(Object)
        );
    });

    it('routes anonymous users to the gated route', async () => {
        mockUser = null;
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Japan to bookmarks' })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/single');
        expect(mockSaveCountry).not.toHaveBeenCalled();
    });

    it('is disabled while pending', () => {
        mockPending = true;
        renderBtn();
        expect(
            screen.getByRole('button', { name: 'Save Japan to bookmarks' })
        ).toBeDisabled();
    });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { PlaceRecommendation } from 'types';

const mockSavePlace = vi.fn();
const mockUnsavePlace = vi.fn();
let mockSavedItems: Array<{ placeKey: string }> = [];
let mockPending = false;

vi.mock('api/hooks/useSavedPlaces', () => ({
    useSavedPlaces: () => ({ data: { items: mockSavedItems } }),
    useSavePlace: () => ({ mutate: mockSavePlace, isPending: mockPending }),
    useUnsavePlace: () => ({ mutate: mockUnsavePlace, isPending: false }),
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

import BookmarkButton from './index';

const place = {
    name: 'Louvre',
    city: 'Paris',
    country: 'France',
    imageUrl: 'http://img',
} as PlaceRecommendation;

const renderBtn = () =>
    renderWithProviders(
        <BookmarkButton place={place} query="museums" index={2} />
    );

beforeEach(() => {
    mockSavePlace.mockReset();
    mockUnsavePlace.mockReset();
    mockNavigate.mockReset();
    mockSavedItems = [];
    mockPending = false;
    mockUser = { id: 'u1' };
});

describe('BookmarkButton', () => {
    it('renders an icon-only button with an accessible save name', () => {
        renderBtn();
        const btn = screen.getByRole('button', {
            name: 'Save Louvre to bookmarks',
        });
        expect(btn).toHaveAttribute('aria-pressed', 'false');
    });

    it('saves with the search identity when signed-in and un-saved', async () => {
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Louvre to bookmarks' })
        );
        expect(mockSavePlace).toHaveBeenCalledWith(
            {
                placeName: 'Louvre',
                placeCity: 'Paris',
                placeCountry: 'France',
                imageUrl: 'http://img',
                searchQuery: 'museums',
                searchIndex: 2,
            },
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            })
        );
    });

    it('shows a confirmation toast on save success', async () => {
        mockSavePlace.mockImplementation((_p, opts) => opts.onSuccess());
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Louvre to bookmarks' })
        );
        expect(
            await screen.findByText('Saved Louvre to your bookmarks')
        ).toBeInTheDocument();
    });

    it('reflects the saved state and removes on click', async () => {
        mockSavedItems = [{ placeKey: 'louvre--paris--france' }];
        renderBtn();
        const btn = screen.getByRole('button', {
            name: 'Remove Louvre from bookmarks',
        });
        expect(btn).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(btn);
        expect(mockUnsavePlace).toHaveBeenCalledWith(
            'louvre--paris--france',
            expect.any(Object)
        );
    });

    it('surfaces the mutation error message via toast', async () => {
        mockUnsavePlace.mockImplementation((_k, opts) =>
            opts.onError(new Error('network down'))
        );
        mockSavedItems = [{ placeKey: 'louvre--paris--france' }];
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Remove Louvre from bookmarks' })
        );
        expect(await screen.findByText('network down')).toBeInTheDocument();
    });

    it('routes anonymous users to the gated route instead of mutating', async () => {
        mockUser = null;
        renderBtn();
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Louvre to bookmarks' })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/single');
        expect(mockSavePlace).not.toHaveBeenCalled();
    });

    it('is disabled while a mutation is pending', () => {
        mockPending = true;
        renderBtn();
        expect(
            screen.getByRole('button', { name: 'Save Louvre to bookmarks' })
        ).toBeDisabled();
    });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

const mockSavePlace = vi.fn();
const mockUnsavePlace = vi.fn();
let mockSavedItems: Array<{ placeKey: string }> = [];
let mockSavePending = false;
let mockUnsavePending = false;

vi.mock('api/hooks/useSavedPlaces', () => ({
    useSavedPlaces: () => ({ data: { items: mockSavedItems } }),
    useSavePlace: () => ({ mutate: mockSavePlace, isPending: mockSavePending }),
    useUnsavePlace: () => ({
        mutate: mockUnsavePlace,
        isPending: mockUnsavePending,
    }),
}));

import ActivityFavoriteButton from './index';

const props = {
    placeName: 'Louvre',
    placeCity: 'Paris',
    placeCountry: 'France',
    placeKey: 'louvre--paris--france',
};

beforeEach(() => {
    mockSavePlace.mockReset();
    mockUnsavePlace.mockReset();
    mockSavedItems = [];
    mockSavePending = false;
    mockUnsavePending = false;
});

describe('ActivityFavoriteButton', () => {
    it('renders the un-saved state with an accessible name and Favorite label', () => {
        renderWithProviders(<ActivityFavoriteButton {...props} />);
        const btn = screen.getByRole('button', {
            name: 'Save Louvre to favorites',
        });
        expect(btn).toHaveAttribute('aria-pressed', 'false');
        expect(btn).not.toBeDisabled();
        expect(screen.getByText('Favorite')).toBeInTheDocument();
    });

    it('fires the save mutation with the place payload when un-saved', async () => {
        renderWithProviders(
            <ActivityFavoriteButton
                {...props}
                countryCode="FR"
                imageUrl="http://img"
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Louvre to favorites' })
        );
        expect(mockSavePlace).toHaveBeenCalledWith({
            placeName: 'Louvre',
            placeCity: 'Paris',
            placeCountry: 'France',
            countryCode: 'FR',
            imageUrl: 'http://img',
        });
        expect(mockUnsavePlace).not.toHaveBeenCalled();
    });

    it('reflects the saved state and removes on click', async () => {
        mockSavedItems = [{ placeKey: 'louvre--paris--france' }];
        renderWithProviders(<ActivityFavoriteButton {...props} />);
        const btn = screen.getByRole('button', {
            name: 'Remove Louvre from favorites',
        });
        expect(btn).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Saved')).toBeInTheDocument();
        await userEvent.click(btn);
        expect(mockUnsavePlace).toHaveBeenCalledWith('louvre--paris--france');
        expect(mockSavePlace).not.toHaveBeenCalled();
    });

    it('derives the place key when no explicit key is supplied', async () => {
        renderWithProviders(
            <ActivityFavoriteButton
                placeName="Louvre"
                placeCity="Paris"
                placeCountry="France"
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Louvre to favorites' })
        );
        expect(mockSavePlace).toHaveBeenCalledWith(
            expect.objectContaining({ placeName: 'Louvre' })
        );
    });

    it('is disabled and does not toggle while a mutation is pending', async () => {
        mockSavePending = true;
        renderWithProviders(<ActivityFavoriteButton {...props} />);
        const btn = screen.getByRole('button', {
            name: 'Save Louvre to favorites',
        });
        expect(btn).toBeDisabled();
        await userEvent.click(btn);
        expect(mockSavePlace).not.toHaveBeenCalled();
    });
});

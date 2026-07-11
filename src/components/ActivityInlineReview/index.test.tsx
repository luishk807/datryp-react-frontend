import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    fireEvent,
} from '../../test/renderWithProviders';
import type { ReviewItem } from 'api/reviewsApi';

let mockUser: { id: string; name: string } | null = null;
let mockMyReview: Partial<ReviewItem> | null = null;
let mockPending = false;
let mockError = false;
const mockUpsert = vi.fn();

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));
vi.mock('api/hooks/useReviews', () => ({
    useMyPlaceReview: () => ({ data: mockMyReview }),
    useUpsertReview: () => ({
        mutate: mockUpsert,
        isPending: mockPending,
        isError: mockError,
    }),
}));

import ActivityInlineReview from './index';

// A keyword-free name → the generic "universal" chip set (deterministic).
const baseProps = {
    placeName: 'Central Plaza',
    placeCity: 'Paris',
    placeCountry: 'France',
    placeKey: 'cp-key',
    itineraryId: 'it-1',
    activityId: 'act-1',
};

const openEditor = async () =>
    userEvent.click(
        screen.getByRole('button', { name: /^review$/i })
    );

beforeEach(() => {
    mockUser = { id: 'u1', name: 'Ana' };
    mockMyReview = null;
    mockPending = false;
    mockError = false;
    mockUpsert.mockReset();
    // Default: run the success callback so a save collapses the editor.
    mockUpsert.mockImplementation(
        (_args: unknown, opts?: { onSuccess?: () => void }) =>
            opts?.onSuccess?.()
    );
});

describe('ActivityInlineReview — gating + collapsed row', () => {
    it('renders nothing for a logged-out user', () => {
        mockUser = null;
        const { container } = renderWithProviders(
            <ActivityInlineReview {...baseProps} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the "Review" call-to-action when unreviewed', () => {
        renderWithProviders(<ActivityInlineReview {...baseProps} />);
        expect(
            screen.getByRole('button', { name: /^review$/i })
        ).toBeInTheDocument();
    });

    it('shows the saved stars + Edit affordance when already reviewed', () => {
        mockMyReview = { rating: 5 };
        renderWithProviders(<ActivityInlineReview {...baseProps} />);
        expect(
            screen.getByRole('button', { name: /edit/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: '5 out of 5 stars' })
        ).toBeInTheDocument();
    });
});

describe('ActivityInlineReview — expanded editor', () => {
    it('reveals the star radiogroup, pills, chips, tip, and actions', async () => {
        renderWithProviders(<ActivityInlineReview {...baseProps} />);
        await openEditor();

        expect(
            screen.getByRole('radiogroup', { name: /pick a rating/i })
        ).toBeInTheDocument();
        expect(
            screen.getByText(/did it live up to expectations/i)
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /as expected/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /worth the money/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: /tip for future travelers/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /^save$/i })
        ).toBeInTheDocument();
    });

    it('keeps Save disabled until a star rating is picked', async () => {
        const { container } = renderWithProviders(
            <ActivityInlineReview {...baseProps} />
        );
        await openEditor();
        expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();

        // The interactive stars are aria-hidden MUI SVGs; click the DOM node.
        const stars = container.querySelectorAll('.star-input-star');
        fireEvent.click(stars[3]);
        expect(screen.getByRole('button', { name: /^save$/i })).toBeEnabled();
    });

    it('caps chip selection at the max and disables the rest', async () => {
        renderWithProviders(<ActivityInlineReview {...baseProps} />);
        await openEditor();

        await userEvent.click(
            screen.getByRole('button', { name: /worth the money/i })
        );
        await userEvent.click(
            screen.getByRole('button', { name: /crowded/i })
        );
        await userEvent.click(
            screen.getByRole('button', { name: /hidden gem/i })
        );
        // A fourth, unselected chip is now blocked.
        expect(
            screen.getByRole('button', { name: /better than photos/i })
        ).toBeDisabled();
        // Deselecting frees the cap again.
        await userEvent.click(
            screen.getByRole('button', { name: /hidden gem/i })
        );
        expect(
            screen.getByRole('button', { name: /better than photos/i })
        ).toBeEnabled();
    });

    it('toggles the visibility options open and picks one', async () => {
        renderWithProviders(<ActivityInlineReview {...baseProps} />);
        await openEditor();
        const toggle = screen.getByRole('button', { name: /visibility/i });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await userEvent.click(
            screen.getByRole('button', { name: /with my name/i })
        );
        expect(
            screen.getByRole('button', { name: /visibility.*with my name/i })
        ).toBeInTheDocument();
    });

    it('cancels back to the collapsed row without saving', async () => {
        renderWithProviders(<ActivityInlineReview {...baseProps} />);
        await openEditor();
        await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(
            screen.getByRole('button', { name: /^review$/i })
        ).toBeInTheDocument();
        expect(mockUpsert).not.toHaveBeenCalled();
    });
});

describe('ActivityInlineReview — save', () => {
    it('submits the full draft and collapses on success', async () => {
        const { container } = renderWithProviders(
            <ActivityInlineReview {...baseProps} />
        );
        await openEditor();

        const stars = container.querySelectorAll('.star-input-star');
        fireEvent.click(stars[4]); // 5 stars
        await userEvent.click(
            screen.getByRole('button', { name: /as expected/i })
        );
        await userEvent.click(
            screen.getByRole('button', { name: /worth the money/i })
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: /tip for future travelers/i }),
            'Go early'
        );
        await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

        expect(mockUpsert).toHaveBeenCalledTimes(1);
        const arg = mockUpsert.mock.calls[0][0];
        expect(arg.placeKey).toBe('cp-key');
        expect(arg.payload.rating).toBe(5);
        expect(arg.payload.expectations).toBe('as_expected');
        expect(arg.payload.tags).toContain('worth_the_money');
        expect(arg.payload.text).toBe('Go early');
        expect(arg.payload.itineraryId).toBe('it-1');
        expect(arg.payload.activityId).toBe('act-1');

        // onSuccess collapsed the editor back to the reviewed/CTA row.
        expect(
            screen.queryByRole('radiogroup', { name: /pick a rating/i })
        ).not.toBeInTheDocument();
    });

    it('prefills the editor from an existing review', async () => {
        mockMyReview = {
            rating: 4,
            expectations: 'better',
            tags: ['crowded'],
            text: 'Loved it',
            visibility: 'public',
        };
        renderWithProviders(<ActivityInlineReview {...baseProps} />);
        await userEvent.click(screen.getByRole('button', { name: /edit/i }));

        expect(
            screen.getByRole('textbox', { name: /tip for future travelers/i })
        ).toHaveValue('Loved it');
        expect(screen.getByRole('button', { name: /^save$/i })).toBeEnabled();
    });

    it('surfaces a save error inline', async () => {
        mockError = true;
        renderWithProviders(<ActivityInlineReview {...baseProps} />);
        await openEditor();
        expect(
            screen.getByText(/couldn.t save — try again/i)
        ).toBeInTheDocument();
    });

    it('shows a saving label while the mutation is pending', async () => {
        mockPending = true;
        renderWithProviders(<ActivityInlineReview {...baseProps} />);
        await openEditor();
        expect(
            screen.getByRole('button', { name: /saving/i })
        ).toBeDisabled();
    });
});

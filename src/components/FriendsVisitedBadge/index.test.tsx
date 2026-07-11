import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

let mockIsDesktop = false;
vi.mock('@mui/material', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@mui/material')>()),
    useMediaQuery: () => mockIsDesktop,
}));

let mockData: unknown;
let mockIsLoading = false;
vi.mock('api/hooks/useFriendsVisited', () => ({
    useFriendsVisited: () => ({ data: mockData, isLoading: mockIsLoading }),
}));

import FriendsVisitedBadge from './index';

const result = {
    count: 2,
    friends: [
        {
            userId: 'f1',
            name: 'Bob Stone',
            profileImageUrl: null,
            visitedAt: '2026-01-15T00:00:00Z',
            rating: 5,
            reviewText: 'Loved it',
        },
        {
            userId: 'f2',
            name: 'Cara Lee',
            profileImageUrl: null,
            visitedAt: '2026-02-20T00:00:00Z',
            rating: null,
            reviewText: null,
        },
    ],
};

const render = () =>
    renderWithProviders(
        <FriendsVisitedBadge kind="place" placeKey="tokyo-tower" />
    );

beforeEach(() => {
    mockNavigate.mockReset();
    mockIsDesktop = false;
    mockData = result;
    mockIsLoading = false;
});

describe('FriendsVisitedBadge', () => {
    it('renders nothing while loading', () => {
        mockIsLoading = true;
        mockData = undefined;
        const { container } = render();
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when no friends visited', () => {
        mockData = { count: 0, friends: [] };
        const { container } = render();
        expect(container).toBeEmptyDOMElement();
    });

    it('renders a "Visited by N" trigger with an accessible name', () => {
        render();
        const trigger = screen.getByRole('button', {
            name: /Visited by 2/i,
        });
        expect(trigger).toHaveTextContent('Visited by 2');
    });

    it('opens a drawer listing each friend who visited', async () => {
        render();
        await userEvent.click(
            screen.getByRole('button', { name: /Visited by 2/i })
        );
        expect(
            screen.getByRole('heading', { name: 'Friends who visited' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Bob Stone/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Cara Lee/i })
        ).toBeInTheDocument();
    });

    it('filters the friend list by the search query', async () => {
        render();
        await userEvent.click(
            screen.getByRole('button', { name: /Visited by 2/i })
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Search friends' }),
            'bob'
        );
        expect(
            screen.getByRole('button', { name: /Bob Stone/i })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Cara Lee/i })
        ).not.toBeInTheDocument();
    });

    it('shows an empty state when the query matches nobody', async () => {
        render();
        await userEvent.click(
            screen.getByRole('button', { name: /Visited by 2/i })
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Search friends' }),
            'zzzzz'
        );
        expect(screen.getByText(/No friends match/i)).toBeInTheDocument();
    });

    it('opens a friend from the keyboard (Enter on the row)', async () => {
        render();
        await userEvent.click(
            screen.getByRole('button', { name: /Visited by 2/i })
        );
        const row = screen.getByRole('button', { name: /Bob Stone/i });
        row.focus();
        await userEvent.keyboard('{Enter}');
        expect(mockNavigate).toHaveBeenCalledWith('/friends');
    });

    it('closes the drawer from the close button', async () => {
        render();
        await userEvent.click(
            screen.getByRole('button', { name: /Visited by 2/i })
        );
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        await waitFor(() =>
            expect(
                screen.queryByRole('heading', { name: 'Friends who visited' })
            ).not.toBeInTheDocument()
        );
    });

    it('renders a centered Dialog on desktop', async () => {
        mockIsDesktop = true;
        render();
        await userEvent.click(
            screen.getByRole('button', { name: /Visited by 2/i })
        );
        expect(
            screen.getByRole('dialog', { name: 'Friends who visited' })
        ).toBeInTheDocument();
    });
});

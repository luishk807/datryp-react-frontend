import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

let mockResult: { data: unknown; isLoading: boolean; isError: boolean } = {
    data: undefined,
    isLoading: false,
    isError: false,
};
vi.mock('api/hooks/useSimilarToSaves', () => ({
    useSimilarToSaves: () => mockResult,
}));

import SimilarToSaves from './index';

const item = (over: Record<string, unknown> = {}) => ({
    placeKey: 'lisbon-pt',
    name: 'Belem Tower',
    city: 'Lisbon',
    country: 'Portugal',
    countryCode: 'PT',
    imageUrl: 'https://img.example/belem.jpg',
    bestTimeToVisit: null,
    similarity: 0.9,
    ...over,
});

beforeEach(() => {
    mockUser = { id: 'u1' };
    mockResult = { data: undefined, isLoading: false, isError: false };
});

describe('SimilarToSaves', () => {
    it('renders nothing for a signed-out visitor', () => {
        mockUser = null;
        mockResult = {
            data: { items: [item()] },
            isLoading: false,
            isError: false,
        };
        const { container } = renderWithProviders(<SimilarToSaves />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing on error or empty results', () => {
        mockResult = { data: { items: [] }, isLoading: false, isError: false };
        const { container } = renderWithProviders(<SimilarToSaves />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows a titled skeleton region while loading', () => {
        mockResult = { data: undefined, isLoading: true, isError: false };
        renderWithProviders(<SimilarToSaves />);
        expect(
            screen.getByRole('heading', { name: /similar to your saves/i })
        ).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders cards with per-item taglines and navigates on click', async () => {
        mockResult = {
            data: {
                items: [
                    item({ placeKey: 'a', name: 'Belem Tower', bestTimeToVisit: 'Spring' }),
                    item({ placeKey: 'b', name: 'Strong Pick', similarity: 0.85 }),
                    item({ placeKey: 'c', name: 'Weak Pick', similarity: 0.3 }),
                ],
            },
            isLoading: false,
            isError: false,
        };
        renderWithProviders(<SimilarToSaves />);

        // Tagline branches: best-time → strong-match → worth-a-look.
        expect(screen.getByText('Best time: Spring')).toBeInTheDocument();
        expect(
            screen.getByText('Strong match to your taste')
        ).toBeInTheDocument();
        expect(screen.getByText('Worth a look')).toBeInTheDocument();

        // City + country compose the card subtitle.
        expect(screen.getAllByText('Lisbon, Portugal').length).toBeGreaterThan(0);

        await userEvent.click(
            screen.getByRole('button', { name: /Belem Tower/i })
        );
        // placeDetailUrl builds via URLSearchParams, which encodes spaces as "+".
        expect(mockNavigate).toHaveBeenCalledWith(
            '/place?q=Belem+Tower&city=Lisbon&country=Portugal'
        );
    });
});

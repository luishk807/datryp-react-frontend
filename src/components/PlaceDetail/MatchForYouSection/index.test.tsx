import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';

let mockUser: { isPaidMember?: boolean } | null = null;
let mockIsAdmin = false;
let mockPrefs: { interests?: string[] } | undefined;
let mockFacts: { greatFor?: string[] } | null | undefined;
let mockFit: { data?: string; isLoading?: boolean } = {};

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));
vi.mock('api/hooks/useMyPreferences', () => ({
    useMyPreferences: () => ({ data: mockPrefs }),
}));
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));
vi.mock('api/hooks/useDestinationFit', () => ({
    useDestinationFit: () => mockFit,
}));

import MatchForYouSection from './index';

const baseProps = {
    code: 'JP',
    name: 'Kyoto',
    country: 'Japan',
    kind: 'city' as const,
};

beforeEach(() => {
    mockUser = null;
    mockIsAdmin = false;
    mockPrefs = undefined;
    mockFacts = undefined;
    mockFit = {};
});

describe('MatchForYouSection — fallback to Great for', () => {
    it('falls back to the Great-for chips when logged out', () => {
        renderWithProviders(
            <MatchForYouSection {...baseProps} greatFor={['foodies', 'beaches']} />
        );
        expect(
            screen.getByRole('heading', { name: /great for/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Foodies')).toBeInTheDocument();
        expect(screen.getByText('Beaches')).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: /is this right for you/i })
        ).not.toBeInTheDocument();
    });

    it('falls back when the user has no saved interests', () => {
        mockUser = { isPaidMember: false };
        mockPrefs = { interests: [] };
        renderWithProviders(
            <MatchForYouSection {...baseProps} greatFor={['foodies']} />
        );
        expect(
            screen.getByRole('heading', { name: /great for/i })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: /is this right for you/i })
        ).not.toBeInTheDocument();
    });
});

describe('MatchForYouSection — computed match', () => {
    it('shows the score, matched interests, and specific misses for a city with its own tags', () => {
        mockUser = { isPaidMember: false };
        mockPrefs = { interests: ['foodie', 'beach'] };
        renderWithProviders(
            <MatchForYouSection {...baseProps} greatFor={['foodies']} />
        );
        expect(
            screen.getByRole('heading', { name: /is this right for you/i })
        ).toBeInTheDocument();
        // foodie satisfied (1 of 2) → round(60 + .5*38) = 79.
        expect(screen.getByText('79%')).toBeInTheDocument();
        expect(screen.getByText(/because you like/i)).toBeInTheDocument();
        expect(screen.getByText('Food')).toBeInTheDocument();
        // beach is a SPECIFIC_NEED and this city carries its own tags.
        expect(screen.getByText(/might not satisfy/i)).toBeInTheDocument();
        expect(screen.getByText('Beaches')).toBeInTheDocument();
    });

    it('exposes the score and each interest as named keyboard tab stops', () => {
        mockUser = { isPaidMember: false };
        mockPrefs = { interests: ['foodie', 'beach'] };
        renderWithProviders(
            <MatchForYouSection {...baseProps} greatFor={['foodies']} />
        );
        // Score is a focusable stat naming its percentage.
        expect(
            screen.getByRole('group', { name: '79% Match' })
        ).toHaveAttribute('tabindex', '0');
        // Each interest is a tab stop whose match/miss context is announced
        // (the check/cross icon is only a visual signal on its own).
        expect(
            screen.getByRole('listitem', { name: 'Because you like: Food' })
        ).toHaveAttribute('tabindex', '0');
        expect(
            screen.getByRole('listitem', { name: 'Might not satisfy: Beaches' })
        ).toHaveAttribute('tabindex', '0');
        // Rows voice themselves → card announces only its title.
        expect(
            screen.getByRole('region', { name: /is this right for you/i })
        ).not.toHaveAttribute('aria-describedby');
    });

    it('suppresses the misses when a city borrows the country tags', () => {
        mockUser = { isPaidMember: false };
        mockPrefs = { interests: ['foodie', 'beach'] };
        mockFacts = { greatFor: ['foodies'] };
        // No `greatFor` prop → falls back to country facts, misses suppressed.
        renderWithProviders(<MatchForYouSection {...baseProps} />);
        expect(screen.getByText(/because you like/i)).toBeInTheDocument();
        expect(screen.getByText('Food')).toBeInTheDocument();
        expect(screen.queryByText(/might not satisfy/i)).not.toBeInTheDocument();
    });

    it('shows misses on a country page (tags always describe the destination)', () => {
        mockUser = { isPaidMember: false };
        mockPrefs = { interests: ['foodie', 'beach'] };
        mockFacts = { greatFor: ['foodies'] };
        renderWithProviders(
            <MatchForYouSection {...baseProps} kind="country" />
        );
        expect(screen.getByText(/might not satisfy/i)).toBeInTheDocument();
        expect(screen.getByText('Beaches')).toBeInTheDocument();
    });

    it('satisfies a budget interest via a low cost level even without a tag', () => {
        mockUser = { isPaidMember: false };
        mockPrefs = { interests: ['budget'] };
        renderWithProviders(
            <MatchForYouSection
                {...baseProps}
                greatFor={['foodies']}
                costLevel={1}
            />
        );
        expect(screen.getByText('98%')).toBeInTheDocument();
        expect(screen.getByText('Budget')).toBeInTheDocument();
    });

    it('satisfies a luxury interest via a high cost level even without a tag', () => {
        mockUser = { isPaidMember: false };
        mockPrefs = { interests: ['luxury'] };
        renderWithProviders(
            <MatchForYouSection
                {...baseProps}
                greatFor={['foodies']}
                costLevel={5}
            />
        );
        expect(screen.getByText('98%')).toBeInTheDocument();
        expect(screen.getByText('Luxury')).toBeInTheDocument();
    });
});

describe('MatchForYouSection — Pro personal take', () => {
    it('renders the AI take for a Pro user once it resolves', () => {
        mockUser = { isPaidMember: true };
        mockPrefs = { interests: ['foodie'] };
        mockFit = { data: 'You will devour the ramen alleys here.' };
        renderWithProviders(
            <MatchForYouSection {...baseProps} greatFor={['foodies']} />
        );
        expect(screen.getByText(/your personal take/i)).toBeInTheDocument();
        expect(screen.getByText('PRO')).toBeInTheDocument();
        expect(
            screen.getByText('You will devour the ramen alleys here.')
        ).toBeInTheDocument();
    });

    it('exposes the Pro take as a focusable group naming its content', () => {
        mockUser = { isPaidMember: true };
        mockPrefs = { interests: ['foodie'] };
        mockFit = { data: 'You will devour the ramen alleys here.' };
        renderWithProviders(
            <MatchForYouSection {...baseProps} greatFor={['foodies']} />
        );
        expect(
            screen.getByRole('group', {
                name: 'Your personal take: You will devour the ramen alleys here.',
            })
        ).toHaveAttribute('tabindex', '0');
    });

    it('shows the loading hint while the Pro take is being fetched', () => {
        mockUser = { isPaidMember: true };
        mockPrefs = { interests: ['foodie'] };
        mockFit = { isLoading: true };
        renderWithProviders(
            <MatchForYouSection {...baseProps} greatFor={['foodies']} />
        );
        expect(
            screen.getByText(/personalizing your take/i)
        ).toBeInTheDocument();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

let mockUser: Record<string, unknown> | null = null;
let mockIsAdmin = false;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

import AiTripBuilderCard from './index';

const proUser = (over: Record<string, unknown> = {}) => ({
    id: 'u1',
    name: 'Luis',
    email: 'luis@x.com',
    isPaidMember: true,
    ...over,
});

beforeEach(() => {
    mockUser = null;
    mockIsAdmin = false;
});

describe('AiTripBuilderCard', () => {
    it('renders nothing for a signed-out visitor', () => {
        const { container } = renderWithProviders(<AiTripBuilderCard />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing for a free (non-admin) user', () => {
        mockUser = proUser({ isPaidMember: false });
        const { container } = renderWithProviders(<AiTripBuilderCard />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders a personalized CTA into /discover for a Pro user', () => {
        mockUser = proUser();
        renderWithProviders(<AiTripBuilderCard />);

        expect(
            screen.getByRole('heading', { name: /skip the planning, luis/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /plan my trip for me/i })
        ).toHaveAttribute('href', '/discover');
    });

    it('renders for an admin even without a paid plan', () => {
        mockUser = proUser({ isPaidMember: false });
        mockIsAdmin = true;
        renderWithProviders(<AiTripBuilderCard />);
        expect(
            screen.getByRole('link', { name: /plan my trip for me/i })
        ).toBeInTheDocument();
    });
});

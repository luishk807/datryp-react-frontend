import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { PopularityInfo } from 'types';

let mockUser: { isPaidMember?: boolean } | null = null;
let mockIsAdmin = false;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

import PopularitySection from './index';

const popularity: PopularityInfo = {
    score: 82,
    trend: 'rising',
    summary: 'Cherry-blossom season is packed this year.',
};

beforeEach(() => {
    mockUser = null;
    mockIsAdmin = false;
});

describe('PopularitySection — Pro gate', () => {
    it('renders nothing for signed-out users', () => {
        const { container } = renderWithProviders(
            <PopularitySection popularity={popularity} isError={false} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing for free-tier users', () => {
        mockUser = { isPaidMember: false };
        const { container } = renderWithProviders(
            <PopularitySection popularity={popularity} isError={false} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders for an admin even without a paid plan', () => {
        mockUser = { isPaidMember: false };
        mockIsAdmin = true;
        renderWithProviders(
            <PopularitySection popularity={popularity} isError={false} />
        );
        expect(
            screen.getByRole('heading', { name: /popularity this year/i })
        ).toBeInTheDocument();
    });
});

describe('PopularitySection — content states (Pro user)', () => {
    beforeEach(() => {
        mockUser = { isPaidMember: true };
    });

    it('renders the widget meter and summary once popularity resolves', () => {
        renderWithProviders(
            <PopularitySection popularity={popularity} isError={false} />
        );
        const meter = screen.getByRole('meter');
        expect(meter).toHaveAttribute('aria-valuenow', '82');
        expect(
            screen.getByText('Cherry-blossom season is packed this year.')
        ).toBeInTheDocument();
    });

    it('shows an inline error when the query failed', () => {
        renderWithProviders(
            <PopularitySection popularity={null} isError />
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            /could not load popularity/i
        );
    });

    it('hides the section when popularity is absent and there is no error', () => {
        const { container } = renderWithProviders(
            <PopularitySection popularity={null} isError={false} />
        );
        expect(container).toBeEmptyDOMElement();
    });
});

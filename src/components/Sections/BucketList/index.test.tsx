import {
    forwardRef,
    useImperativeHandle,
    type ReactNode,
} from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../../test/renderWithProviders';
import {
    BucketListBlockedError,
    BucketListPaywallError,
} from 'api/bucketListApi';

// ── Controlled hook + context state — flipped per test. ──────────────────
const mockNavigate = vi.fn();
let mockUser: Record<string, unknown> | null = {
    id: 'u1',
    name: 'Luis',
    isPaidMember: false,
    travelerStyles: [],
};
let mockIsAdmin = false;
let mockItems: unknown[] = [];
let mockLoading = false;
let mockAddPending = false;
let mockGeneratePending = false;
let mockBackfilling = false;
const mockAdd = vi.fn();
const mockRemove = vi.fn();
const mockGenerate = vi.fn();
const mockRunBackfill = vi.fn();
const mockOpenPaywall = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

vi.mock('api/hooks/useBucketList', () => ({
    useBucketList: () => ({ data: mockItems, isLoading: mockLoading }),
    useAddBucketListItem: () => ({
        mutateAsync: mockAdd,
        isPending: mockAddPending,
    }),
    useDeleteBucketListItem: () => ({ mutateAsync: mockRemove }),
    useEnrichExistingBucketList: () => ({
        mutate: mockRunBackfill,
        isPending: mockBackfilling,
    }),
    useGenerateTripFromBucket: () => ({
        mutateAsync: mockGenerate,
        isPending: mockGeneratePending,
    }),
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('components/AiTripLoader', () => ({
    default: ({ open, title }: { open: boolean; title?: string }) =>
        open ? <div data-testid="ai-loader">{title}</div> : null,
}));

vi.mock('components/PaywallModal', () => ({
    default: forwardRef((_props, ref) => {
        useImperativeHandle(ref, () => ({
            openModel: mockOpenPaywall,
            closeModal: vi.fn(),
        }));
        return <div data-testid="paywall-modal" />;
    }),
}));

import BucketList from './index';

const goal = (over: Record<string, unknown> = {}) => ({
    id: 'b1',
    text: 'Northern lights in Norway',
    title: null,
    description: null,
    emoji: null,
    tags: [],
    enrichmentAttempted: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
});

// Scope the wizard's build button to the wizard region (found via its step-2
// heading) so it's never confused with a card CTA elsewhere on the page.
const wizardBuildButton = () => {
    const wizard = screen
        .getByRole('heading', { name: /how long should the trip be/i })
        .closest('.bucket-wizard') as HTMLElement;
    return within(wizard).getByRole('button', { name: 'Build trip' });
};

beforeEach(() => {
    mockUser = { id: 'u1', name: 'Luis', isPaidMember: false, travelerStyles: [] };
    mockIsAdmin = false;
    mockItems = [];
    mockLoading = false;
    mockAddPending = false;
    mockGeneratePending = false;
    mockBackfilling = false;
    mockNavigate.mockReset();
    mockAdd.mockReset().mockResolvedValue(undefined);
    mockRemove.mockReset().mockResolvedValue(undefined);
    mockGenerate.mockReset().mockResolvedValue({ itineraryId: 'trip-1' });
    mockRunBackfill.mockReset();
    mockOpenPaywall.mockReset();
    // jsdom doesn't implement scrollIntoView — the "add a dream" path uses it.
    Element.prototype.scrollIntoView = vi.fn();
});

describe('BucketList', () => {
    it('renders the personalized heading and a loading state', () => {
        mockLoading = true;
        renderWithProviders(<BucketList />);
        expect(
            screen.getByRole('heading', { name: /luis's travel goals/i })
        ).toBeInTheDocument();
        expect(screen.getByText(/loading your list/i)).toBeInTheDocument();
    });

    it('shows the empty state', () => {
        renderWithProviders(<BucketList />);
        expect(
            screen.getByText(/your bucket list is empty/i)
        ).toBeInTheDocument();
    });

    it('shows the free-tier "slots used" cap meter', () => {
        mockItems = [goal(), goal({ id: 'b2' }), goal({ id: 'b3' })];
        renderWithProviders(<BucketList />);
        expect(screen.getByText(/free slots used/i)).toBeInTheDocument();
    });

    it('opens the paywall from the "cap full" upgrade link', async () => {
        mockItems = Array.from({ length: 10 }, (_, i) => goal({ id: `b${i}` }));
        renderWithProviders(<BucketList />);
        await userEvent.click(
            screen.getByRole('button', { name: /upgrade to pro/i })
        );
        expect(mockOpenPaywall).toHaveBeenCalledTimes(1);
    });

    it('renders a free-tier card with a Pro-locked CTA and opens the paywall', async () => {
        mockItems = [goal()];
        renderWithProviders(<BucketList />);
        expect(screen.getByText('Create trip')).toBeInTheDocument();
        // The locked CTA's accessible name is its descriptive `ariaLabel`
        // (buildLockedAria), which overrides the visible "Create trip" — this
        // query fails if the prop is ever dropped (regression guard).
        const cta = screen.getByRole('button', {
            name: /upgrade to create a trip/i,
        });
        await userEvent.click(cta);
        expect(mockOpenPaywall).toHaveBeenCalledTimes(1);
    });

    it('deletes a card', async () => {
        mockItems = [goal()];
        renderWithProviders(<BucketList />);
        await userEvent.click(screen.getByRole('button', { name: /^remove/i }));
        expect(mockRemove).toHaveBeenCalledWith('b1');
    });

    it('disables Add until text is entered, then adds and clears the input', async () => {
        renderWithProviders(<BucketList />);
        expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();

        const input = screen.getByPlaceholderText(/watch an fc barcelona/i);
        await userEvent.type(input, 'See the pyramids');
        await userEvent.click(screen.getByRole('button', { name: 'Add' }));
        expect(mockAdd).toHaveBeenCalledWith('See the pyramids');
        await waitFor(() => expect(input).toHaveValue(''));
    });

    it('opens the paywall when Add hits the free-tier cap (402)', async () => {
        mockAdd.mockRejectedValue(
            new BucketListPaywallError({
                kind: 'bucket_list_cap',
                message: 'cap',
                cap: 10,
                current_count: 10,
            })
        );
        renderWithProviders(<BucketList />);
        await userEvent.type(
            screen.getByPlaceholderText(/watch an fc barcelona/i),
            'Trip 11'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Add' }));
        await waitFor(() => expect(mockOpenPaywall).toHaveBeenCalled());
    });

    it('surfaces a moderation-blocked add error', async () => {
        mockAdd.mockRejectedValue(
            new BucketListBlockedError({
                message: "We can't add that one",
                category: 'x',
            })
        );
        renderWithProviders(<BucketList />);
        await userEvent.type(
            screen.getByPlaceholderText(/watch an fc barcelona/i),
            'bad goal'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Add' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            /can't add that one/i
        );
    });

    it('surfaces a generic add error', async () => {
        mockAdd.mockRejectedValue(new Error('network down'));
        renderWithProviders(<BucketList />);
        await userEvent.type(
            screen.getByPlaceholderText(/watch an fc barcelona/i),
            'anything'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Add' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            /network down/i
        );
    });

    it('runs the AI build wizard for a Pro user and navigates to the new trip', async () => {
        mockUser = {
            id: 'u1',
            name: 'Luis',
            isPaidMember: true,
            travelerStyles: ['Foodie'],
        };
        mockItems = [goal({ title: 'Aurora Weekend', enrichmentAttempted: true })];
        renderWithProviders(<BucketList />);

        // The Pro card CTA's accessible name is its descriptive `ariaLabel`
        // (buildAria = "Create trip from …"), distinct from the wizard's own
        // "Build trip" button that appears after it opens.
        await userEvent.click(
            screen.getByRole('button', { name: /^Create trip from/i })
        );
        // Step 1 — party size.
        expect(
            screen.getByRole('heading', {
                name: /how many people are going/i,
            })
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        // Step 2 — duration.
        expect(
            screen.getByRole('heading', { name: /how long should the trip be/i })
        ).toBeInTheDocument();
        await userEvent.click(wizardBuildButton());

        expect(mockGenerate).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'b1',
                input: expect.objectContaining({
                    partySize: 2,
                    travelerStyles: ['Foodie'],
                }),
            })
        );
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('/trip-detail?id=trip-1')
        );
    });

    it('passes the chosen party size and duration to the generator', async () => {
        mockUser = {
            id: 'u1',
            name: 'Luis',
            isPaidMember: true,
            travelerStyles: [],
        };
        mockItems = [goal({ title: 'Aurora Weekend' })];
        renderWithProviders(<BucketList />);

        await userEvent.click(
            screen.getByRole('button', { name: /^Create trip from/i })
        );
        await userEvent.click(screen.getByText('4')); // party chip: Family
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByText('7')); // duration chip: 7 days
        await userEvent.click(wizardBuildButton());

        expect(mockGenerate).toHaveBeenCalledWith(
            expect.objectContaining({
                input: expect.objectContaining({
                    partySize: 4,
                    durationDays: 7,
                }),
            })
        );
    });

    it('supports the custom party input, the Back button and auto duration', async () => {
        mockUser = {
            id: 'u1',
            name: 'Luis',
            isPaidMember: true,
            travelerStyles: [],
        };
        mockItems = [goal({ title: 'Aurora Weekend' })];
        renderWithProviders(<BucketList />);

        await userEvent.click(
            screen.getByRole('button', { name: /^Create trip from/i })
        );
        const custom = screen.getByLabelText(/or enter a number/i);
        await userEvent.clear(custom);
        await userEvent.type(custom, '3');
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByText('7'));
        await userEvent.click(screen.getByRole('button', { name: /back/i }));
        // Back on step 1.
        expect(
            screen.getByRole('heading', { name: /how many people are going/i })
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByText(/smart picks/i)); // Auto → no duration
        await userEvent.click(wizardBuildButton());

        expect(mockGenerate).toHaveBeenCalledWith(
            expect.objectContaining({
                input: expect.objectContaining({
                    partySize: 3,
                    durationDays: undefined,
                }),
            })
        );
    });

    it('cancels the build wizard', async () => {
        mockUser = { id: 'u1', name: 'Luis', isPaidMember: true, travelerStyles: [] };
        mockItems = [goal({ title: 'Aurora Weekend' })];
        renderWithProviders(<BucketList />);
        await userEvent.click(
            screen.getByRole('button', { name: /^Create trip from/i })
        );
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(
            screen.queryByRole('heading', {
                name: /how many people are going/i,
            })
        ).not.toBeInTheDocument();
    });

    it('surfaces a friendly error when trip generation fails', async () => {
        const consoleSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        mockUser = { id: 'u1', name: 'Luis', isPaidMember: true, travelerStyles: [] };
        mockItems = [goal({ title: 'Aurora Weekend' })];
        mockGenerate.mockRejectedValue(new Error('500'));
        renderWithProviders(<BucketList />);

        await userEvent.click(
            screen.getByRole('button', { name: /^Create trip from/i })
        );
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(wizardBuildButton());

        expect(await screen.findByRole('alert')).toHaveTextContent(
            /couldn't build your trip/i
        );
        consoleSpy.mockRestore();
    });

    it('navigates to the discover matcher from the entry header', async () => {
        renderWithProviders(<BucketList />);
        await userEvent.click(
            screen.getByRole('button', { name: /get ai destination ideas/i })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/discover');
    });

    it('focuses the add-goal input from the "add a dream" entry tile', async () => {
        renderWithProviders(<BucketList />);
        const input = screen.getByPlaceholderText(/watch an fc barcelona/i);
        await userEvent.click(
            screen.getByRole('button', { name: /add it to your bucket list/i })
        );
        expect(input).toHaveFocus();
    });

    it('kicks off the Pro enrichment backfill and shows its loader', () => {
        mockUser = { id: 'u1', name: 'Luis', isPaidMember: true, travelerStyles: [] };
        mockItems = [goal({ enrichmentAttempted: false })];
        mockBackfilling = true;
        renderWithProviders(<BucketList />);
        expect(mockRunBackfill).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('ai-loader')).toBeInTheDocument();
    });
});

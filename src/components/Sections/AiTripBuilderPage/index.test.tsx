import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
    fireEvent,
} from '../../../test/renderWithProviders';
import { BucketListPaywallError } from 'api/bucketListApi';

// ── Controlled mock state — reset in beforeEach. ─────────────────────────
const mockNavigate = vi.fn();
const mockCapture = vi.fn();
const mockGenerateTripOptions = vi.fn();
const mockPlanTripWithAi = vi.fn();
let mockUser: Record<string, unknown> | null = null;
let mockIsAdmin = false;
let mockLocationState: Record<string, unknown> | null = null;

vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
    useLocation: () => ({
        state: mockLocationState,
        pathname: '/discover',
        search: '',
        hash: '',
        key: 'test',
    }),
    Navigate: ({ to }: { to: string }) => (
        <div data-testid="navigate" data-to={to} />
    ),
}));

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

vi.mock('lib/posthog', () => ({
    capture: (...args: unknown[]) => mockCapture(...args),
}));

// Forward only the input (first arg) — React Query passes a mutation context
// as a 2nd arg to `mutationFn` that we don't want polluting call assertions.
vi.mock('api/aiTripBuilderApi', () => ({
    generateTripOptions: (input: unknown) => mockGenerateTripOptions(input),
    planTripWithAi: (input: unknown) => mockPlanTripWithAi(input),
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('components/AiTripLoader', () => ({
    default: ({ open, title }: { open: boolean; title?: string }) =>
        open ? <div data-testid="ai-loader">{title}</div> : null,
}));

import AiTripBuilderPage from './index';

const jpOption = {
    countryName: 'Japan',
    countryCode: 'JP',
    headline: 'Cherry blossoms and ramen',
    whyThisFits: 'You love food tours and beach vibes',
    estimatedCostUsd: 1200,
    durationDays: 7,
    highlights: ['Tokyo', 'Kyoto', 'Osaka', 'Nara', 'ExtraFifth'],
    imageUrl: 'https://img/jp.jpg',
    photographerName: 'Ana',
    photographerUrl: 'https://unsplash/ana',
};

const peOption = {
    countryName: 'Peru',
    countryCode: 'PE',
    headline: 'Andes and ancient trails',
    whyThisFits: 'Mountain treks and Inca history',
    estimatedCostUsd: 5000,
    durationDays: 9,
    highlights: ['Cusco', 'Machu Picchu'],
    imageUrl: null,
    photographerName: null,
    photographerUrl: null,
};

const buildResult = {
    itineraryId: 'trip-9',
    tripType: 'single',
    tripName: 'Japan Trip',
    countryName: 'Japan',
    durationDays: 7,
    rationale: 'because',
};

// Drive the wizard from the interests step onward to the options grid. Assumes
// interests are pre-seeded so the Next/validation gates pass.
const reachOptions = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.click(
        screen.getByRole('button', { name: /show me destination options/i })
    );
    await screen.findByRole('heading', { name: /pick the one that calls/i });
};

beforeEach(() => {
    mockUser = {
        id: 'u1',
        name: 'Luis',
        isPaidMember: true,
        interests: [],
        travelerStyles: [],
    };
    mockIsAdmin = false;
    mockLocationState = null;
    mockNavigate.mockReset();
    mockCapture.mockReset();
    mockGenerateTripOptions.mockReset().mockResolvedValue([]);
    mockPlanTripWithAi.mockReset().mockResolvedValue(buildResult);
});

describe('AiTripBuilderPage — Pro gate', () => {
    it('redirects free non-admin users to /membership', () => {
        mockUser = { id: 'u1', name: 'Luis', isPaidMember: false, interests: [] };
        renderWithProviders(<AiTripBuilderPage />);
        expect(screen.getByTestId('navigate')).toHaveAttribute(
            'data-to',
            '/membership'
        );
    });

    it('redirects anonymous users to /membership', () => {
        mockUser = null;
        renderWithProviders(<AiTripBuilderPage />);
        expect(screen.getByTestId('navigate')).toHaveAttribute(
            'data-to',
            '/membership'
        );
    });

    it('lets a non-paid admin through the gate', () => {
        mockUser = { id: 'u1', name: 'Luis', isPaidMember: false, interests: [] };
        mockIsAdmin = true;
        renderWithProviders(<AiTripBuilderPage />);
        expect(
            screen.getByRole('heading', { name: /tell us what you love/i })
        ).toBeInTheDocument();
    });
});

describe('AiTripBuilderPage — wizard', () => {
    it('renders the hero and the 4-step stepper for a Pro user', () => {
        renderWithProviders(<AiTripBuilderPage />);
        expect(
            screen.getByRole('heading', { name: /tell us what you love/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Budget' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Interests' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Destination' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Trip details' })
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    });

    it('applies a budget preset to the input', async () => {
        renderWithProviders(<AiTripBuilderPage />);
        await userEvent.click(screen.getByText('$3,500'));
        expect(screen.getByRole('spinbutton')).toHaveValue(3500);
    });

    it('blocks Next with a below-minimum budget', async () => {
        renderWithProviders(<AiTripBuilderPage />);
        const budget = screen.getByRole('spinbutton');
        await userEvent.clear(budget);
        await userEvent.type(budget, '50');
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            /at least \$100/i
        );
    });

    it('blocks Next with an above-maximum budget', async () => {
        renderWithProviders(<AiTripBuilderPage />);
        const budget = screen.getByRole('spinbutton');
        await userEvent.clear(budget);
        await userEvent.type(budget, '60000');
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            /caps at \$50,000/i
        );
    });

    it('blocks Next on the interests step when none are chosen', async () => {
        renderWithProviders(<AiTripBuilderPage />);
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            /add at least one interest/i
        );
    });

    it('adds interests via Enter/suggestion/comma, dedupes, and removes a chip', async () => {
        renderWithProviders(<AiTripBuilderPage />);
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        const draft = screen.getByRole('textbox', {
            name: /what do you want to do/i,
        });
        await userEvent.type(draft, 'fishing{Enter}');
        expect(screen.getByText('fishing')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: '+ Beach' }));
        expect(screen.getAllByText('Beach')).toHaveLength(1);

        // Case-insensitive dedupe — typing an existing one is a no-op.
        await userEvent.type(draft, 'beach{Enter}');
        expect(screen.getAllByText('Beach')).toHaveLength(1);

        await userEvent.clear(draft);
        await userEvent.type(draft, 'hiking,');
        expect(screen.getByText('hiking')).toBeInTheDocument();

        const chip = screen
            .getByText('fishing')
            .closest('.MuiChip-root') as HTMLElement;
        fireEvent.click(within(chip).getByTestId('CancelIcon'));
        expect(screen.queryByText('fishing')).not.toBeInTheDocument();
    });

    it('navigates forward/back and jumps to a completed step via the stepper', async () => {
        mockUser = { ...mockUser!, interests: ['beach'] };
        renderWithProviders(<AiTripBuilderPage />);
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(
            screen.getByRole('heading', { name: /what do you want to do/i })
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(
            screen.getByRole('heading', { name: /anywhere in mind/i })
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(
            screen.getByRole('heading', { name: /what do you want to do/i })
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Budget' }));
        expect(
            screen.getByRole('heading', { name: /how much do you want to spend/i })
        ).toBeInTheDocument();
        // A future step is not reachable via the stepper.
        expect(
            screen.getByRole('button', { name: 'Destination' })
        ).toBeDisabled();
    });

    it('sets a quick-pick destination and clears it with "Anywhere"', async () => {
        mockUser = { ...mockUser!, interests: ['beach'] };
        renderWithProviders(<AiTripBuilderPage />);
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        const input = screen.getByRole('textbox', {
            name: /anywhere in mind/i,
        });
        await userEvent.click(screen.getByRole('button', { name: 'Europe' }));
        expect(input).toHaveValue('Europe');
        await userEvent.click(screen.getByRole('button', { name: 'Anywhere' }));
        expect(input).toHaveValue('');
    });

    it('exposes duration + party-size controls on the details step', async () => {
        mockUser = { ...mockUser!, interests: ['beach'] };
        renderWithProviders(<AiTripBuilderPage />);
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(
            screen.getByRole('heading', {
                name: /how long should the trip be/i,
            })
        ).toBeInTheDocument();
        expect(screen.getByText('solo')).toBeInTheDocument();
        expect(screen.getByText('couple')).toBeInTheDocument();
        expect(screen.getByText('family')).toBeInTheDocument();
        expect(screen.getByText('group')).toBeInTheDocument();

        await userEvent.click(screen.getByText('5'));
        const durationInput = screen.getByRole('spinbutton', {
            name: /how long should the trip be/i,
        });
        expect(durationInput).toHaveValue(5);
        await userEvent.click(screen.getByText('Auto'));
        expect(durationInput).toHaveValue(null);

        await userEvent.type(durationInput, '9');
        expect(durationInput).toHaveValue(9);

        const partyInput = screen.getByRole('spinbutton', {
            name: /how many people are going/i,
        });
        await userEvent.click(screen.getByText('4'));
        expect(partyInput).toHaveValue(4);
        await userEvent.clear(partyInput);
        await userEvent.type(partyInput, '3');
        expect(partyInput).toHaveValue(3);
    });

    it('pre-fills the destination from navigation state', async () => {
        mockLocationState = { countryHint: 'Italy' };
        mockUser = { ...mockUser!, interests: ['beach'] };
        renderWithProviders(<AiTripBuilderPage />);
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(
            screen.getByRole('textbox', { name: /anywhere in mind/i })
        ).toHaveValue('Italy');
    });
});

describe('AiTripBuilderPage — generate + build flow', () => {
    it('maps wizard inputs, shows options, and builds the picked trip', async () => {
        mockUser = {
            id: 'u1',
            name: 'Luis',
            isPaidMember: true,
            interests: ['beach', 'food tour'],
            travelerStyles: ['Foodie'],
        };
        mockGenerateTripOptions.mockResolvedValue([jpOption, peOption]);
        renderWithProviders(<AiTripBuilderPage />);

        await userEvent.click(screen.getByRole('button', { name: 'Next' })); // interests
        await userEvent.click(screen.getByRole('button', { name: 'Next' })); // destination
        await userEvent.type(
            screen.getByRole('textbox', { name: /anywhere in mind/i }),
            'Japan'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Next' })); // details
        await userEvent.click(screen.getByText('5')); // duration
        await userEvent.click(screen.getByText('4')); // party
        await userEvent.click(
            screen.getByRole('button', { name: /show me destination options/i })
        );

        await screen.findByRole('heading', { name: /pick the one that calls/i });
        expect(mockGenerateTripOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                budgetUsd: 1500,
                interests: ['beach', 'food tour'],
                durationDays: 5,
                countryHint: 'Japan',
                partySize: 4,
                travelerStyles: ['Foodie'],
            })
        );

        // Options grid: top pick badge + both cards + match rationale.
        expect(
            screen.getByText(/we think this is the best fit/i)
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /cherry blossoms and ramen/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /andes and ancient trails/i })
        ).toBeInTheDocument();
        expect(screen.getByText(/why this matches you/i)).toBeInTheDocument();
        expect(
            screen.getByText(/fits your \$1,500 budget/i)
        ).toBeInTheDocument();

        const jpCard = screen
            .getByRole('heading', { name: /cherry blossoms and ramen/i })
            .closest('article') as HTMLElement;
        await userEvent.click(
            within(jpCard).getByRole('button', { name: /build this trip/i })
        );

        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('/trip-detail?id=trip-9')
        );
        expect(mockPlanTripWithAi).toHaveBeenCalledWith(
            expect.objectContaining({
                countryHint: 'Japan',
                heroImageUrl: 'https://img/jp.jpg',
                partySize: 4,
                travelerStyles: ['Foodie'],
            })
        );
        expect(mockCapture).toHaveBeenCalledWith(
            'trip_generated',
            expect.objectContaining({
                kind: 'ai',
                trip_type: 'single',
                duration_days: 7,
            })
        );
    }, 20000);

    it('shows the loader while options are pending', async () => {
        mockUser = { ...mockUser!, interests: ['beach'] };
        mockGenerateTripOptions.mockReturnValue(new Promise(() => {}));
        renderWithProviders(<AiTripBuilderPage />);
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(
            screen.getByRole('button', { name: /show me destination options/i })
        );
        expect(await screen.findByTestId('ai-loader')).toHaveTextContent(
            /finding your destination matches/i
        );
    });

    it('builds via the "surprise me" shortcut using the top option', async () => {
        mockUser = { ...mockUser!, interests: ['beach'] };
        mockGenerateTripOptions.mockResolvedValue([jpOption, peOption]);
        renderWithProviders(<AiTripBuilderPage />);
        await reachOptions();
        await userEvent.click(
            screen.getByRole('button', { name: /pick the best fit/i })
        );
        await waitFor(() =>
            expect(mockPlanTripWithAi).toHaveBeenCalledWith(
                expect.objectContaining({ countryHint: 'Japan' })
            )
        );
    });

    it('shows a per-card building state and dims the others', async () => {
        mockUser = { ...mockUser!, interests: ['beach'] };
        mockGenerateTripOptions.mockResolvedValue([jpOption, peOption]);
        mockPlanTripWithAi.mockReturnValue(new Promise(() => {}));
        renderWithProviders(<AiTripBuilderPage />);
        await reachOptions();

        const jpCard = screen
            .getByRole('heading', { name: /cherry blossoms and ramen/i })
            .closest('article') as HTMLElement;
        await userEvent.click(
            within(jpCard).getByRole('button', { name: /build this trip/i })
        );

        expect(
            await screen.findByText(/building this trip/i)
        ).toBeInTheDocument();
        expect(screen.getByTestId('ai-loader')).toHaveTextContent(
            /crafting your trip/i
        );
        const peCard = screen
            .getByRole('heading', { name: /andes and ancient trails/i })
            .closest('article') as HTMLElement;
        expect(
            within(peCard).getByRole('button', { name: /build this trip/i })
        ).toBeDisabled();
    });

    it('returns to the wizard from "Edit my inputs"', async () => {
        mockUser = { ...mockUser!, interests: ['beach'] };
        mockGenerateTripOptions.mockResolvedValue([jpOption]);
        renderWithProviders(<AiTripBuilderPage />);
        await reachOptions();
        await userEvent.click(
            screen.getByRole('button', { name: /edit my inputs/i })
        );
        expect(
            screen.getByRole('heading', { name: /tell us what you love/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Budget' })
        ).toBeInTheDocument();
    });
});

describe('AiTripBuilderPage — error + paywall paths', () => {
    it('surfaces a generic options error in an alert', async () => {
        mockUser = { ...mockUser!, interests: ['beach'] };
        mockGenerateTripOptions.mockRejectedValue(new Error('options boom'));
        renderWithProviders(<AiTripBuilderPage />);
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(
            screen.getByRole('button', { name: /show me destination options/i })
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            /options boom/i
        );
    });

    it('redirects to /membership when options hit the Pro paywall', async () => {
        mockUser = { ...mockUser!, interests: ['beach'] };
        mockGenerateTripOptions.mockRejectedValue(
            new BucketListPaywallError({
                kind: 'ai_trip_builder_pro',
                message: 'pay up',
            })
        );
        renderWithProviders(<AiTripBuilderPage />);
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        await userEvent.click(
            screen.getByRole('button', { name: /show me destination options/i })
        );
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('/membership')
        );
    });

    it('surfaces a generic build error in an alert', async () => {
        mockUser = { ...mockUser!, interests: ['beach'] };
        mockGenerateTripOptions.mockResolvedValue([jpOption]);
        mockPlanTripWithAi.mockRejectedValue(new Error('build boom'));
        renderWithProviders(<AiTripBuilderPage />);
        await reachOptions();
        const jpCard = screen
            .getByRole('heading', { name: /cherry blossoms and ramen/i })
            .closest('article') as HTMLElement;
        await userEvent.click(
            within(jpCard).getByRole('button', { name: /build this trip/i })
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            /build boom/i
        );
    });

    it('redirects to /membership when the build hits the Pro paywall', async () => {
        mockUser = { ...mockUser!, interests: ['beach'] };
        mockGenerateTripOptions.mockResolvedValue([jpOption]);
        mockPlanTripWithAi.mockRejectedValue(
            new BucketListPaywallError({
                kind: 'ai_trip_builder_pro',
                message: 'pay up',
            })
        );
        renderWithProviders(<AiTripBuilderPage />);
        await reachOptions();
        const jpCard = screen
            .getByRole('heading', { name: /cherry blossoms and ramen/i })
            .closest('article') as HTMLElement;
        await userEvent.click(
            within(jpCard).getByRole('button', { name: /build this trip/i })
        );
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('/membership')
        );
    });
});

describe('AiTripBuilderPage — locked destination', () => {
    it('skips the destination step and builds the locked country directly', async () => {
        mockLocationState = { countryHint: 'Japan', lockDestination: true };
        mockUser = {
            id: 'u1',
            name: 'Luis',
            isPaidMember: true,
            interests: ['hiking'],
            travelerStyles: [],
        };
        renderWithProviders(<AiTripBuilderPage />);

        // No destination step in the stepper when the country is locked.
        expect(
            screen.queryByRole('button', { name: 'Destination' })
        ).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Next' })); // interests
        await userEvent.click(screen.getByRole('button', { name: 'Next' })); // details
        await userEvent.click(
            screen.getByRole('button', { name: /plan my trip/i })
        );

        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('/trip-detail?id=trip-9')
        );
        expect(mockGenerateTripOptions).not.toHaveBeenCalled();
        expect(mockPlanTripWithAi).toHaveBeenCalledWith(
            expect.objectContaining({ countryHint: 'Japan' })
        );
        expect(mockPlanTripWithAi.mock.calls[0][0]).not.toHaveProperty(
            'heroImageUrl'
        );
    });
});

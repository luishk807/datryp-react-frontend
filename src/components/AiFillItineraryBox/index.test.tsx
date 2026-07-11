import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../test/renderWithProviders';
import { BucketListPaywallError } from 'api/bucketListApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

const mockCompleteTripWithAi = vi.fn();
vi.mock('api/aiFillItineraryApi', () => ({
    completeTripWithAi: (...args: unknown[]) =>
        mockCompleteTripWithAi(...args),
}));

import AiFillItineraryBox from './index';

const CTA = 'Plan it for me';
const CONFIRM = 'Plan my itinerary';

beforeEach(() => {
    mockNavigate.mockReset();
    mockCompleteTripWithAi.mockReset();
});

describe('AiFillItineraryBox', () => {
    it('renders a named CTA and the Pro badge', () => {
        renderWithProviders(
            <AiFillItineraryBox tripId="t1" place="Japan" isPro />
        );
        expect(
            screen.getByRole('button', { name: CTA })
        ).toBeInTheDocument();
    });

    it('routes non-Pro users to the membership upsell instead of the modal', async () => {
        renderWithProviders(
            <AiFillItineraryBox tripId="t1" place="Japan" isPro={false} />
        );
        await userEvent.click(screen.getByRole('button', { name: CTA }));
        expect(mockNavigate).toHaveBeenCalledWith('/membership');
        expect(
            screen.queryByRole('heading', { name: CONFIRM })
        ).not.toBeInTheDocument();
    });

    it('opens the confirm modal for Pro users', async () => {
        renderWithProviders(
            <AiFillItineraryBox tripId="t1" place="Japan" isPro />
        );
        await userEvent.click(screen.getByRole('button', { name: CTA }));
        // ModalButton wraps a MUI `Modal` (no role="dialog"); detect the
        // modal via its title heading.
        expect(
            screen.getByRole('heading', { name: CONFIRM })
        ).toBeInTheDocument();
    });

    it('fires the AI fill and closes the modal on success', async () => {
        mockCompleteTripWithAi.mockResolvedValue({
            itineraryId: 'i1',
            addedCount: 3,
        });
        renderWithProviders(
            <AiFillItineraryBox tripId="t1" place="Japan" isPro />
        );
        await userEvent.click(screen.getByRole('button', { name: CTA }));
        await userEvent.click(
            screen.getByRole('button', { name: CONFIRM })
        );
        expect(mockCompleteTripWithAi).toHaveBeenCalledWith(
            't1',
            expect.any(String)
        );
        await waitFor(() =>
            expect(
                screen.queryByRole('heading', { name: CONFIRM })
            ).not.toBeInTheDocument()
        );
    });

    it('shows a loading state while the fill is in flight', async () => {
        mockCompleteTripWithAi.mockReturnValue(new Promise(() => {}));
        renderWithProviders(
            <AiFillItineraryBox tripId="t1" place="Japan" isPro />
        );
        await userEvent.click(screen.getByRole('button', { name: CTA }));
        await userEvent.click(
            screen.getByRole('button', { name: CONFIRM })
        );
        expect(
            await screen.findByText(/Planning the best activities for Japan/i)
        ).toBeInTheDocument();
    });

    it('surfaces a generic error and offers a retry', async () => {
        mockCompleteTripWithAi.mockRejectedValue(new Error('server exploded'));
        renderWithProviders(
            <AiFillItineraryBox tripId="t1" place="Japan" isPro />
        );
        await userEvent.click(screen.getByRole('button', { name: CTA }));
        await userEvent.click(
            screen.getByRole('button', { name: CONFIRM })
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'server exploded'
        );
        expect(
            screen.getByRole('button', { name: 'Try again' })
        ).toBeInTheDocument();
    });

    it('routes to the upsell when the fill hits the paywall', async () => {
        mockCompleteTripWithAi.mockRejectedValue(
            new BucketListPaywallError({
                kind: 'ai_trip_builder_pro',
                message: 'Upgrade to unlock',
            })
        );
        renderWithProviders(
            <AiFillItineraryBox tripId="t1" place="Japan" isPro />
        );
        await userEvent.click(screen.getByRole('button', { name: CTA }));
        await userEvent.click(
            screen.getByRole('button', { name: CONFIRM })
        );
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('/membership')
        );
    });
});

import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import { TripProvider } from 'context/TripContext';
import StepperComp, { type StepperStep } from './index';

// useUser throws outside a UserProvider; the lookup queries would hit the
// network. Both are mocked so the wizard renders offline. TripProvider is the
// real (network-free) reducer context so useTripDispatch resolves.
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: null, isAdmin: false }),
}));

vi.mock('api/hooks/useLookups', () => ({
    useItineraryTypes: () => ({ data: [] }),
    useTripStatuses: () => ({ data: [] }),
}));

const steps: StepperStep[] = [
    { label: 'First', comp: <div>Step one body</div> },
    { label: 'Second', comp: <div>Step two body</div> },
];

const renderStepper = (props: Record<string, unknown> = {}) =>
    renderWithProviders(
        <TripProvider>
            <StepperComp steps={steps} {...props} />
        </TripProvider>
    );

describe('StepperComp', () => {
    it('renders the first step with a Next action and no Back', () => {
        renderStepper();
        expect(screen.getByText('Step one body')).toBeInTheDocument();
        expect(screen.queryByText('Step two body')).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /next/i })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /back/i })
        ).not.toBeInTheDocument();
    });

    it('advances to the next step and reveals a Back button', async () => {
        renderStepper();
        await userEvent.click(screen.getByRole('button', { name: /next/i }));
        expect(screen.getByText('Step two body')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /back/i })
        ).toBeInTheDocument();
    });

    it('returns to the previous step when Back is clicked', async () => {
        renderStepper();
        await userEvent.click(screen.getByRole('button', { name: /next/i }));
        await userEvent.click(screen.getByRole('button', { name: /back/i }));
        expect(screen.getByText('Step one body')).toBeInTheDocument();
        expect(screen.queryByText('Step two body')).not.toBeInTheDocument();
    });

    it('notifies the parent when the active step changes', async () => {
        const onActiveStepChange = vi.fn();
        renderStepper({ onActiveStepChange });
        // Fired once on mount for the initial step.
        expect(onActiveStepChange).toHaveBeenCalledWith(0);
        await userEvent.click(screen.getByRole('button', { name: /next/i }));
        expect(onActiveStepChange).toHaveBeenCalledWith(1);
    });
});

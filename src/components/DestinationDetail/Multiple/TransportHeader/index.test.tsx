import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../../test/renderWithProviders';
import { ACTIVITY_KIND } from 'constants';
import type { TransportLeg } from './index';

// AddBudget is a full ModalButton flow; stub it to a button that fires the
// submit callback so the flight-money edit path is drivable without the modal.
const mockAddBudget = vi.fn();
vi.mock('components/DestinationDetail/AddBudget', () => ({
    default: (props: any) => {
        mockAddBudget(props);
        return (
            <button
                type="button"
                onClick={() =>
                    props.onSubmit([{ user: { id: 1, label: 'Ana' }, budget: '40' }])
                }
            >
                add-budget
            </button>
        );
    },
}));
vi.mock('components/common/AirlineLogo', () => ({
    default: (props: any) => <span data-testid="airline-logo">{props.label}</span>,
}));

import TransportHeader from './index';

const leg = (over: Partial<TransportLeg> = {}): TransportLeg => ({
    departPlace: 'JFK',
    departMeta: 'Jun 15 · 10:00 AM',
    arrivalPlace: 'LAX',
    arrivalMeta: 'Jun 15 · 1:00 PM',
    ...over,
});

describe('TransportHeader — single flight leg', () => {
    it('renders Depart/Arrive labels, the two airports, and the flight cost', () => {
        render(
            <TransportHeader
                mode={ACTIVITY_KIND.FLIGHT}
                legs={[leg()]}
                costLabel="Flight cost"
                cost={250}
            />
        );
        expect(screen.getByText('Depart')).toBeInTheDocument();
        expect(screen.getByText('Arrive')).toBeInTheDocument();
        expect(screen.getByText('JFK')).toBeInTheDocument();
        expect(screen.getByText('LAX')).toBeInTheDocument();
        expect(screen.getByText('Flight cost')).toBeInTheDocument();
    });

    it('shows a "Not set" placeholder for a leg with empty endpoints', () => {
        render(
            <TransportHeader
                mode={ACTIVITY_KIND.FLIGHT}
                legs={[leg({ departPlace: '', arrivalPlace: '' })]}
                costLabel="Flight cost"
            />
        );
        expect(screen.getAllByText('Not set').length).toBe(2);
    });
});

describe('TransportHeader — multi-leg + carrier rows', () => {
    it('labels each leg and shows the per-leg airline logo for flights', () => {
        render(
            <TransportHeader
                mode={ACTIVITY_KIND.FLIGHT}
                legs={[
                    leg({ flightNumber: 'UA1' }),
                    leg({
                        departPlace: 'LAX',
                        arrivalPlace: 'HNL',
                        flightNumber: 'UA2',
                    }),
                ]}
                costLabel="Flight cost"
            />
        );
        expect(screen.getByText('Depart · Leg 1')).toBeInTheDocument();
        expect(screen.getByText('Arrive · Leg 2')).toBeInTheDocument();
        // stopover connector between the two legs
        expect(screen.getByLabelText('stopover')).toBeInTheDocument();
        expect(screen.getAllByTestId('airline-logo').length).toBe(2);
    });
});

describe('TransportHeader — ground transit', () => {
    it('renders the train icons and no airline logo, cost read-only when no submit', () => {
        const { container } = render(
            <TransportHeader
                mode={ACTIVITY_KIND.TRAIN}
                legs={[leg({ departPlace: 'Madrid', arrivalPlace: 'Barcelona' })]}
                costLabel="Transport cost"
                cost={100}
                budgets={[
                    { id: 5, user: { id: 2, name: 'Bob' }, budget: '100' },
                ]}
            />
        );
        expect(screen.getByText('Transport cost')).toBeInTheDocument();
        // Paid-by chip renders from budgets; ground path is read-only.
        expect(screen.getByText('Paid by')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(
            container.querySelector('.content-flight-paidby-readonly')
        ).toBeInTheDocument();
        expect(screen.queryByTestId('airline-logo')).not.toBeInTheDocument();
    });
});

describe('TransportHeader — money edit (flight path)', () => {
    it('renders AddBudget and forwards its submitted entries', async () => {
        const onBudgetSubmit = vi.fn();
        render(
            <TransportHeader
                mode={ACTIVITY_KIND.FLIGHT}
                legs={[leg()]}
                costLabel="Flight cost"
                cost={250}
                participants={[{ id: 1, label: 'Ana' } as any]}
                onBudgetSubmit={onBudgetSubmit}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'add-budget' }));
        expect(onBudgetSubmit).toHaveBeenCalledWith([
            { user: { id: 1, label: 'Ana' }, budget: '40' },
        ]);
    });

    it('renders nothing money-related when there is neither cost nor budget', () => {
        render(
            <TransportHeader
                mode={ACTIVITY_KIND.FLIGHT}
                legs={[leg()]}
                costLabel="Flight cost"
            />
        );
        expect(screen.queryByText('Flight cost')).not.toBeInTheDocument();
        expect(screen.queryByText('Paid by')).not.toBeInTheDocument();
    });
});

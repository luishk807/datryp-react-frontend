/**
 * Per-payer expense breakdown for a trip. Matches the bottom block of
 * the Excel export — Total + per-payer totals with percentages +
 * Balance row. Useful both on screen (organizers want this glance
 * any time, not just when exporting) and in print (prints with the
 * rest of the trip detail page so paper copies are usable).
 *
 * Hidden entirely when no budget items exist on any activity — a
 * solo trip with zero expense splits doesn't need this section.
 */
import { useMemo } from 'react';
import { convertMoney } from 'utils';
import type { Destination, TripState } from 'types';
import './index.scss';

interface TripExpenseSummaryProps {
    data: TripState;
}

interface PayerLine {
    name: string;
    total: number;
}

interface ExpenseTotals {
    grandTotal: number;
    perPayer: PayerLine[];
    balance: number;
}

const toNumber = (v?: string | number): number => {
    if (v == null) return 0;
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};

const computeTotals = (destinations: Destination[] = []): ExpenseTotals => {
    const byPayer = new Map<string, number>();
    let grandTotal = 0;
    let activityCostTotal = 0;

    for (const dest of destinations) {
        for (const day of dest.itinerary ?? []) {
            for (const activity of day.activities ?? []) {
                activityCostTotal += toNumber(activity.cost);
                for (const b of activity.budget ?? []) {
                    const name =
                        b.user?.label ?? b.user?.name ?? '(unknown)';
                    const amt = toNumber(b.budget);
                    byPayer.set(name, (byPayer.get(name) ?? 0) + amt);
                    grandTotal += amt;
                }
            }
        }
    }

    const perPayer = Array.from(byPayer.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

    // Balance = activity-level cost that isn't accounted for in any
    // budget split. Positive number means some expenses haven't been
    // assigned to a payer yet (worth surfacing rather than hiding).
    // Negative would indicate over-allocation — also worth seeing.
    const balance = activityCostTotal - grandTotal;

    return { grandTotal, perPayer, balance };
};

const TripExpenseSummary = ({ data }: TripExpenseSummaryProps) => {
    const { grandTotal, perPayer, balance } = useMemo(
        () => computeTotals(data.destinations),
        [data.destinations],
    );

    // No budget splits → no value in showing the section. Don't
    // render anything so the page stays tight.
    if (perPayer.length === 0 && Math.abs(balance) < 0.01) {
        return null;
    }

    return (
        <section className="trip-expense-summary">
            <h3 className="trip-expense-summary-title">Expense summary</h3>
            <table className="trip-expense-summary-table">
                <tbody>
                    <tr className="trip-expense-summary-total-row">
                        <td className="trip-expense-summary-label">Total</td>
                        <td className="trip-expense-summary-amount">
                            {convertMoney(grandTotal)}
                        </td>
                        <td className="trip-expense-summary-percent">100%</td>
                    </tr>
                    {perPayer.map((p) => {
                        const percent =
                            grandTotal > 0 ? (p.total / grandTotal) * 100 : 0;
                        return (
                            <tr
                                key={p.name}
                                className="trip-expense-summary-row"
                            >
                                <td className="trip-expense-summary-label">
                                    {p.name}
                                </td>
                                <td className="trip-expense-summary-amount">
                                    {convertMoney(p.total)}
                                </td>
                                <td className="trip-expense-summary-percent">
                                    {percent.toFixed(1)}%
                                </td>
                            </tr>
                        );
                    })}
                    {Math.abs(balance) >= 0.01 && (
                        <tr className="trip-expense-summary-balance-row">
                            <td className="trip-expense-summary-label">
                                Unassigned
                            </td>
                            <td className="trip-expense-summary-amount">
                                {convertMoney(balance)}
                            </td>
                            <td className="trip-expense-summary-percent" />
                        </tr>
                    )}
                </tbody>
            </table>
            {Math.abs(balance) >= 0.01 && (
                <p className="trip-expense-summary-hint">
                    {balance > 0
                        ? `${convertMoney(balance)} of activity costs aren't assigned to a payer yet.`
                        : `Payer splits exceed the activity totals by ${convertMoney(Math.abs(balance))}.`}
                </p>
            )}
        </section>
    );
};

export default TripExpenseSummary;

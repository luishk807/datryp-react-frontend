import { useMemo } from 'react';
import './index.css';
import classNames from 'classnames';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import { convertMoney } from 'utils';
import type { Destination, TripState } from 'types/trip';

interface BudgetSummaryProps {
    data: TripState;
}

type BudgetStatus = 'under' | 'warning' | 'over' | 'empty';

const toNumber = (v?: string | number): number => {
    if (v == null) return 0;
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};

const sumActivityCosts = (destinations: Destination[] = []): number => {
    let total = 0;
    destinations.forEach((dest) => {
        dest.itinerary?.forEach((day) => {
            day.activities?.forEach((activity) => {
                total += toNumber(activity.cost);
            });
        });
    });
    return total;
};

const BudgetSummary = ({ data }: BudgetSummaryProps) => {
    const { spent, budget, percent, status, remaining } = useMemo(() => {
        const spent = sumActivityCosts(data.destinations);
        const budget = toNumber(data.budget);
        const remaining = budget - spent;
        const percent = budget > 0 ? (spent / budget) * 100 : 0;
        let status: BudgetStatus = 'under';
        if (budget <= 0) status = 'empty';
        else if (percent > 100) status = 'over';
        else if (percent >= 80) status = 'warning';
        return { spent, budget, percent, status, remaining };
    }, [data]);

    const barWidth = Math.min(percent, 100);

    return (
        <section className={classNames('budget-summary', `budget-${status}`)}>
            <div className="budget-header">
                <div className="budget-eyebrow-wrap">
                    <AccountBalanceWalletOutlinedIcon className="budget-eyebrow-icon" />
                    <span className="budget-eyebrow">Trip budget</span>
                </div>
                <div className="budget-amounts">
                    <span className="budget-spent">{convertMoney(spent)}</span>
                    {budget > 0 && (
                        <>
                            <span className="budget-divider">/</span>
                            <span className="budget-total">{convertMoney(budget)}</span>
                        </>
                    )}
                </div>
            </div>

            {status !== 'empty' && (
                <div className="budget-bar">
                    <div
                        className="budget-bar-fill"
                        style={{ width: `${barWidth}%` }}
                    />
                </div>
            )}

            <div className="budget-footer">
                {status === 'empty' && (
                    <span className="budget-message">
                        Set a budget on the trip details to track spending.
                    </span>
                )}
                {status === 'under' && (
                    <>
                        <CheckCircleOutlineIcon className="budget-icon" />
                        <span className="budget-message">
                            On track · {convertMoney(remaining)} remaining
                        </span>
                    </>
                )}
                {status === 'warning' && (
                    <>
                        <WarningAmberIcon className="budget-icon" />
                        <span className="budget-message">
                            Getting close · {convertMoney(remaining)} left
                        </span>
                    </>
                )}
                {status === 'over' && (
                    <>
                        <ReportProblemOutlinedIcon className="budget-icon" />
                        <span className="budget-message">
                            Over budget by {convertMoney(Math.abs(remaining))}
                        </span>
                    </>
                )}
                {status !== 'empty' && (
                    <span className="budget-percent">{percent.toFixed(0)}%</span>
                )}
            </div>
        </section>
    );
};

export default BudgetSummary;

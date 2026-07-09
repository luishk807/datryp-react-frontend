import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './index.scss';
import classNames from 'classnames';
import { IconButton, Tooltip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingFlatRoundedIcon from '@mui/icons-material/TrendingFlatRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { convertMoney, sumActivityCosts } from 'utils';
import { useBudgetVerdict } from 'hooks/useBudgetVerdict';
import { BUDGET_STATUS } from 'constants';
import type { BudgetStatus, TripState } from 'types';

interface BudgetSummaryProps {
    data: TripState;
    /** When true the bar + status footer collapse behind a toggle.
     *  The header (eyebrow + amounts) stays visible so the user can
     *  see the totals at a glance. Matches the pattern in
     *  `BasicTripInfo` so the two sections feel consistent. */
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    /** Externally-controlled collapse state — overrides the internal
     *  toggle. Used by `/trip-detail` to drive ONE Show/Hide detail
     *  button governing both BasicTripInfo and BudgetSummary together. */
    collapsed?: boolean;
    /** Hide the internal chevron toggle. Pair with controlled
     *  `collapsed` when the parent renders its own single toggle. */
    hideToggle?: boolean;
}

const toNumber = (v?: string | number): number => {
    if (v == null) return 0;
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};

const BudgetSummary = ({
    data,
    collapsible = false,
    defaultCollapsed = false,
    collapsed: controlledCollapsed,
    hideToggle = false,
}: BudgetSummaryProps) => {
    const { t } = useTranslation();
    const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
    const collapsed =
        controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
    const setCollapsed = (next: boolean) => setInternalCollapsed(next);
    const { spent, budget, percent, status, remaining } = useMemo(() => {
        const spent = sumActivityCosts(data.destinations);
        const budget = toNumber(data.budget);
        const remaining = budget - spent;
        const percent = budget > 0 ? (spent / budget) * 100 : 0;
        let status: BudgetStatus = BUDGET_STATUS.UNDER;
        if (budget <= 0) status = BUDGET_STATUS.EMPTY;
        else if (percent > 100) status = BUDGET_STATUS.OVER;
        else if (percent >= 80) status = BUDGET_STATUS.WARNING;
        return { spent, budget, percent, status, remaining };
    }, [data]);

    const barWidth = Math.min(percent, 100);

    // AI verdict on whether the *budget itself* is tight / right-sized /
    // cushioned for the destination (distinct from the spend-progress
    // bar below). Moved here from the BasicTripInfo budget tile so it
    // sits with the money-at-a-glance meter.
    const budgetVerdict = useBudgetVerdict(data);

    return (
        <section className={classNames('budget-summary', `budget-${status}`)}>
            <div className="budget-header">
                <div className="budget-eyebrow-wrap">
                    <AccountBalanceWalletOutlinedIcon className="budget-eyebrow-icon" />
                    <span className="budget-eyebrow">{t('tripDetail.budget.meter')}</span>
                    {budgetVerdict && (
                        <span
                            className={classNames(
                                'budget-verdict',
                                `budget-verdict-${budgetVerdict.tone}`,
                            )}
                        >
                            {budgetVerdict.tone === 'low' && (
                                <TrendingDownRoundedIcon
                                    className="budget-verdict-arrow"
                                    fontSize="small"
                                />
                            )}
                            {budgetVerdict.tone === 'on' && (
                                <TrendingFlatRoundedIcon
                                    className="budget-verdict-arrow"
                                    fontSize="small"
                                />
                            )}
                            {budgetVerdict.tone === 'high' && (
                                <TrendingUpRoundedIcon
                                    className="budget-verdict-arrow"
                                    fontSize="small"
                                />
                            )}
                            <span className="budget-verdict-label">
                                {budgetVerdict.label}
                            </span>
                            <Tooltip
                                title={budgetVerdict.why}
                                arrow
                                placement="top"
                                enterTouchDelay={0}
                                leaveTouchDelay={6000}
                            >
                                <InfoOutlinedIcon
                                    className="budget-verdict-why"
                                    fontSize="small"
                                    tabIndex={0}
                                    aria-label={budgetVerdict.why}
                                />
                            </Tooltip>
                        </span>
                    )}
                </div>
                <div className="budget-amounts">
                    <span className="budget-spent">{convertMoney(spent)}</span>
                    {budget > 0 && (
                        <>
                            <span className="budget-divider">/</span>
                            <span className="budget-total">{convertMoney(budget)}</span>
                        </>
                    )}
                    {collapsible && !hideToggle && (
                        <IconButton
                            size="small"
                            className={classNames('budget-collapse-toggle', {
                                'is-collapsed': collapsed,
                            })}
                            aria-label={
                                collapsed
                                    ? t('tripDetail.budget.showDetails')
                                    : t('tripDetail.budget.hideDetails')
                            }
                            aria-expanded={!collapsed}
                            onClick={() => setCollapsed(!collapsed)}
                        >
                            <ExpandMoreRoundedIcon />
                        </IconButton>
                    )}
                </div>
            </div>

            <div
                className={classNames('budget-collapsible-body', {
                    'is-collapsed': collapsible && collapsed,
                })}
                // `inert` so controls inside the collapsed body leave the tab
                // order too (CSS only collapses max-height, keeping them
                // focusable otherwise).
                inert={collapsible && collapsed}
            >
            {status !== BUDGET_STATUS.EMPTY && (
                <div className="budget-bar">
                    <div
                        className="budget-bar-fill"
                        style={{ width: `${barWidth}%` }}
                    />
                </div>
            )}

            <div className="budget-footer">
                {status === BUDGET_STATUS.EMPTY && (
                    <span className="budget-message">
                        {t('tripDetail.budget.empty')}
                    </span>
                )}
                {status === BUDGET_STATUS.UNDER && (
                    <>
                        <CheckCircleOutlineIcon className="budget-icon" />
                        <span className="budget-message">
                            {t('tripDetail.budget.onTrack', {
                                amount: convertMoney(remaining),
                            })}
                        </span>
                    </>
                )}
                {status === BUDGET_STATUS.WARNING && (
                    <>
                        <WarningAmberIcon className="budget-icon" />
                        <span className="budget-message">
                            {t('tripDetail.budget.gettingClose', {
                                amount: convertMoney(remaining),
                            })}
                        </span>
                    </>
                )}
                {status === BUDGET_STATUS.OVER && (
                    <>
                        <ReportProblemOutlinedIcon className="budget-icon" />
                        <span className="budget-message">
                            {t('tripDetail.budget.over', {
                                amount: convertMoney(Math.abs(remaining)),
                            })}
                        </span>
                    </>
                )}
                {status !== BUDGET_STATUS.EMPTY && (
                    <span className="budget-percent">
                        {t('tripDetail.budget.percent', {
                            pct: percent.toFixed(0),
                        })}
                    </span>
                )}
            </div>
            </div>
        </section>
    );
};

export default BudgetSummary;

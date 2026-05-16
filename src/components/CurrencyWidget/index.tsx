import './index.scss';
import type { CurrencyInfo } from 'types';

export interface CurrencyWidgetProps {
    /** Currency info for the destination — code, name, and approximate rate
     *  per USD. Sourced from OpenAI's training data; display as-is with the
     *  built-in "approximate" disclaimer. */
    info: CurrencyInfo;
}

/** Format the rate by magnitude: thousands → no decimals, tens → one,
 *  small numbers → two. Keeps the display readable across very different
 *  currencies (e.g. KRW 1300 vs CHF 0.91). */
const formatRate = (rate: number): string => {
    if (rate >= 100) return rate.toFixed(0);
    if (rate >= 10) return rate.toFixed(1);
    return rate.toFixed(2);
};

/**
 * Compact "1 USD ≈ N <CODE>" chip plus the currency's full name and an
 * approximate-rate disclaimer.
 */
const CurrencyWidget = ({ info }: CurrencyWidgetProps) => (
    <div className="currency-widget">
        <div className="currency-widget-rate">
            <span className="currency-widget-from">1 USD</span>
            <span className="currency-widget-arrow" aria-hidden="true">
                ≈
            </span>
            <span className="currency-widget-amount">{formatRate(info.ratePerUsd)}</span>
            <span className="currency-widget-code">{info.code}</span>
        </div>
        <p className="currency-widget-name">{info.name}</p>
        <p className="currency-widget-disclaimer">
            Approximate — check before travel.
        </p>
    </div>
);

export default CurrencyWidget;

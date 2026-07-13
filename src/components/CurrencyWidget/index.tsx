import './index.scss';
import { useTranslation } from 'react-i18next';
import { useFxRates } from 'api/hooks/useFxRates';
import { useUserCurrency } from 'api/hooks/useUserCurrency';
import type { CurrencyInfo } from 'types';

export interface CurrencyWidgetProps {
    /** Currency info for the destination — code, name, and approximate rate
     *  per USD. Sourced from OpenAI's training data; used as the
     *  destination-side rate when Frankfurter doesn't carry that currency. */
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
 * Conversion chip: "1 <from> ≈ N <dest>" — defaults `from` to the user's
 * IP-detected home currency (e.g. PAB for Panama, CNY for China). Falls
 * back to USD if either the user-currency lookup or the FX rates source
 * doesn't carry it. Below the chip: destination currency name + a
 * live-rate badge or fallback disclaimer.
 */
/** Currency code → spoken name ("USD" → "US Dollar") via Intl, so the rate
 *  reads as a sentence instead of letter-by-letter code. Falls back to the raw
 *  code if the runtime/locale can't resolve it. */
const currencyName = (code: string, locale: string): string => {
    try {
        return (
            new Intl.DisplayNames([locale || 'en'], { type: 'currency' }).of(
                code
            ) ?? code
        );
    } catch {
        return code;
    }
};

const CurrencyWidget = ({ info }: CurrencyWidgetProps) => {
    const { t, i18n } = useTranslation();
    const { data: userCurrency } = useUserCurrency();
    const { data: fxRates } = useFxRates();

    const userCode = (userCurrency ?? 'USD').toUpperCase();
    const userRateUsd = fxRates?.[userCode];
    const destRateUsd = fxRates?.[info.code] ?? info.ratePerUsd;

    // Only swap "1 USD" out for the user's currency if we can actually
    // convert it. Otherwise the chip still makes sense in USD.
    const fromCode = userRateUsd && userRateUsd > 0 ? userCode : 'USD';
    const fromRateUsd = userRateUsd && userRateUsd > 0 ? userRateUsd : 1;

    const rate = destRateUsd / fromRateUsd;
    const usingLiveRates = Boolean(fxRates);
    const isHomeCurrency = fromCode === info.code;

    return (
        <div className="currency-widget">
            {isHomeCurrency ? (
                <p className="currency-widget-home">
                    {t('detail.common.currencyWidget.home')}
                </p>
            ) : (
                <div
                    className="currency-widget-rate"
                    role="img"
                    aria-label={t('detail.common.currencyWidget.rateAria', {
                        from: currencyName(fromCode, i18n.language),
                        rate: formatRate(rate),
                        dest: info.name,
                    })}
                >
                    <span className="currency-widget-from" aria-hidden="true">
                        1 {fromCode}
                    </span>
                    <span className="currency-widget-arrow" aria-hidden="true">
                        ≈
                    </span>
                    <span className="currency-widget-amount" aria-hidden="true">
                        {formatRate(rate)}
                    </span>
                    <span className="currency-widget-code" aria-hidden="true">
                        {info.code}
                    </span>
                </div>
            )}
            <p className="currency-widget-name">{info.name}</p>
            {!isHomeCurrency && (
                <p className="currency-widget-disclaimer">
                    {usingLiveRates
                        ? t('detail.common.currencyWidget.liveRate')
                        : t('detail.common.currencyWidget.approx')}
                </p>
            )}
        </div>
    );
};

export default CurrencyWidget;

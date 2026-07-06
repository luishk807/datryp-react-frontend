import './index.scss';
import { useTranslation } from 'react-i18next';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';

const ROW_KEYS = ['cards', 'cash', 'atm'] as const;

export interface CurrencyTipsSectionProps {
    /** ISO-2 country code the money tips are curated / AI-generated for. */
    code: string;
}

/**
 * "Cards & cash" sidebar card — the day-to-day "how do I actually pay here?"
 * answer (cards accepted? cash needed? ATM availability?), complementing the
 * exchange-rate widget. Served on the same /country-facts payload as Quick
 * facts. Self-hides while loading, on error, and when there are no tips.
 */
const CurrencyTipsSection = ({ code }: CurrencyTipsSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    const tips = data?.currencyTips;
    if (!tips) return null;

    const rows = ROW_KEYS.filter((key) => tips[key]).map((key) => ({
        key,
        label: t(`currencyTips.${key}`),
        value: tips[key] as string,
    }));
    if (rows.length === 0) return null;

    return (
        <DetailSection
            className="currency-tips-section"
            title={t('currencyTips.title')}
            icon={<CreditCardRoundedIcon />}
        >
            <ul className="currency-tips-list">
                {rows.map((row) => (
                    <li key={row.key} className="currency-tips-row">
                        <span className="currency-tips-label">{row.label}</span>
                        <span className="currency-tips-value">{row.value}</span>
                    </li>
                ))}
            </ul>
        </DetailSection>
    );
};

export default CurrencyTipsSection;

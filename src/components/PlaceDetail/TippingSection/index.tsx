import './index.scss';
import { useTranslation } from 'react-i18next';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';

export interface TippingSectionProps {
    /** ISO-2 country code the tipping norms are curated for. */
    code: string;
}

// Preferred display order for the free-form category map.
const CATEGORY_ORDER = [
    'restaurants',
    'bars',
    'cafes',
    'taxi',
    'hotel',
    'guide',
    'porter',
] as const;

/**
 * "Tipping" sidebar card on a country / city / place detail page — the
 * expectation travelers Google constantly, at a glance: a one-line stance plus
 * per-service norms (restaurants / taxi / hotel …). Hand-curated on the backend
 * (never AI), served on the same /country-facts payload as Quick facts and
 * Religion. Self-hides while loading, on error, and for any uncurated country.
 */
const TippingSection = ({ code }: TippingSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    const tipping = data?.tipping;
    if (!tipping) return null;

    const cats = tipping.categories ?? {};
    const rows = [
        ...CATEGORY_ORDER.filter((k) => cats[k]),
        ...Object.keys(cats).filter(
            (k) => !CATEGORY_ORDER.includes(k as (typeof CATEGORY_ORDER)[number])
        ),
    ].map((key) => ({
        key,
        label: t(`tipping.categories.${key}`, { defaultValue: key }),
        value: cats[key],
    }));

    return (
        <DetailSection
            className="tipping-section"
            title={t('tipping.title')}
            icon={<PaymentsRoundedIcon />}
            contentRead="items"
        >
            <p className="tipping-summary">{tipping.summary}</p>
            {rows.length > 0 && (
                <ul className="tipping-list">
                    {rows.map((row) => (
                        // Each row is its own tab stop so keyboard +
                        // screen-reader users hear "<label>: <value>" per row,
                        // instead of the whole card being one stop that only
                        // announces "Tipping".
                        <li
                            key={row.key}
                            className="tipping-row"
                            tabIndex={0}
                            aria-label={`${row.label}: ${row.value}`}
                        >
                            <span className="tipping-label">{row.label}</span>
                            <span className="tipping-value">{row.value}</span>
                        </li>
                    ))}
                </ul>
            )}
        </DetailSection>
    );
};

export default TippingSection;

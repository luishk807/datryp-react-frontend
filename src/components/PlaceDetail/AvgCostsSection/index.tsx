import './index.scss';
import { useTranslation } from 'react-i18next';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';
import type { AvgCostsInfo } from 'api/countryFactsApi';

const DAILY_KEYS = ['budget', 'midrange', 'luxury'] as const;
const SAMPLE_KEYS = ['meal', 'coffee', 'transit', 'beer'] as const;

export interface AvgCostsSectionProps {
    /** ISO-2 country code the cost estimates are curated / AI-generated for. */
    code: string;
}

/**
 * "Average costs" sidebar card — the "how expensive is this place?" answer:
 * daily budget bands (budget / mid-range / luxury) plus a few anchor prices
 * (meal / coffee / transit / beer). Everything is in USD and deliberately
 * approximate, so the card always carries a "≈ USD · prices vary" footnote
 * (independent of the source-based caveat). Rides the same /country-facts
 * payload as the other facts cards; self-hides when there's nothing to show.
 */
const AvgCostsSection = ({ code }: AvgCostsSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    const costs = data?.avgCosts;
    if (!costs) return null;

    const rowsFor = (keys: readonly (keyof AvgCostsInfo)[]) =>
        keys
            .filter((key) => costs[key])
            .map((key) => ({
                key,
                label: t(`avgCosts.${key}`),
                value: costs[key] as string,
            }));

    const groups = [
        { key: 'daily', label: t('avgCosts.dailyLabel'), rows: rowsFor(DAILY_KEYS) },
        {
            key: 'samples',
            label: t('avgCosts.samplesLabel'),
            rows: rowsFor(SAMPLE_KEYS),
        },
    ].filter((group) => group.rows.length > 0);
    if (groups.length === 0) return null;

    return (
        <DetailSection
            className="avg-costs-section"
            title={t('avgCosts.title')}
            icon={<PaymentsRoundedIcon />}
            contentRead="items"
        >
            {groups.map((group) => (
                <div key={group.key} className="avg-costs-group">
                    <span className="avg-costs-group-label">{group.label}</span>
                    <ul className="avg-costs-list">
                        {group.rows.map((row) => (
                            // Each row is its own tab stop so keyboard +
                            // screen-reader users hear "<label>: <value>" per
                            // row, instead of the whole card being one stop
                            // that only announces "Average costs".
                            <li
                                key={row.key}
                                className="avg-costs-row"
                                tabIndex={0}
                                aria-label={`${row.label}: ${row.value}`}
                            >
                                <span className="avg-costs-label">
                                    {row.label}
                                </span>
                                <span className="avg-costs-value">
                                    {row.value}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            <p className="avg-costs-note">{t('avgCosts.note')}</p>
        </DetailSection>
    );
};

export default AvgCostsSection;

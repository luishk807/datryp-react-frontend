import './index.scss';
import { useTranslation } from 'react-i18next';
import AccessibleRoundedIcon from '@mui/icons-material/AccessibleRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';

const ROW_KEYS = ['wheelchair', 'transit', 'sidewalks', 'signage'] as const;

export interface AccessibilitySectionProps {
    /** ISO-2 country code the accessibility basics are curated / AI-generated
     *  for. */
    code: string;
}

/**
 * "Accessibility" sidebar card — a quick read for travelers with mobility,
 * transit, or language needs (wheelchair-friendliness, transit accessibility,
 * sidewalk quality, English signage). Served on the same /country-facts
 * payload. Self-hides while loading, on error, and when there's nothing.
 */
const AccessibilitySection = ({ code }: AccessibilitySectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    const access = data?.accessibility;
    if (!access) return null;

    const rows = ROW_KEYS.filter((key) => access[key]).map((key) => ({
        key,
        label: t(`accessibility.${key}`),
        value: access[key] as string,
    }));
    if (rows.length === 0) return null;

    return (
        <DetailSection
            className="accessibility-section"
            title={t('accessibility.title')}
            icon={<AccessibleRoundedIcon />}
            contentRead="items"
        >
            <ul className="accessibility-list">
                {rows.map((row) => (
                    // Each row is its own tab stop so keyboard + screen-reader
                    // users hear "<label>: <value>" per row, instead of the
                    // whole card being one stop that only says "Accessibility".
                    <li
                        key={row.key}
                        className="accessibility-row"
                        tabIndex={0}
                        aria-label={`${row.label}: ${row.value}`}
                    >
                        <span className="accessibility-label">{row.label}</span>
                        <span className="accessibility-value">{row.value}</span>
                    </li>
                ))}
            </ul>
        </DetailSection>
    );
};

export default AccessibilitySection;

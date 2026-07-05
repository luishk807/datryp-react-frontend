import './index.scss';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded';
import PowerRoundedIcon from '@mui/icons-material/PowerRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';

export interface CountryFactsSectionProps {
    /** ISO-2 country code the facts are curated for. */
    code: string;
}

// Preferred display order for the free-form emergency map — the single
// dial-anything `general` number leads, then the service-specific ones.
const EMERGENCY_ORDER = [
    'general',
    'police',
    'ambulance',
    'fire',
    'tourist',
    'mobile',
    'eu',
    'alt',
] as const;

/** Signed hour offset of `timeZone` from the visitor's own zone, right now.
 *  Positive = the destination is ahead. Returns null for an unknown zone. */
const offsetHoursFromViewer = (timeZone: string): number | null => {
    try {
        const now = new Date();
        const target = new Date(
            now.toLocaleString('en-US', { timeZone })
        ).getTime();
        const local = new Date(now.toLocaleString('en-US')).getTime();
        if (Number.isNaN(target) || Number.isNaN(local)) return null;
        return (target - local) / 3_600_000;
    } catch {
        return null;
    }
};

/** Current wall-clock time in `timeZone`, formatted in the visitor's locale,
 *  or null for an unknown zone. */
const localTimeIn = (timeZone: string): string | null => {
    try {
        return new Intl.DateTimeFormat(undefined, {
            timeZone,
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date());
    } catch {
        return null;
    }
};

/**
 * "Quick facts" sidebar card on a country / city / place detail page — the
 * grounded, safety-critical reference a traveler wants at a glance: emergency
 * numbers, mains power (plug types + voltage/frequency), and the live local
 * time with the offset from the visitor's own clock. All hand-curated on the
 * backend (never AI — a wrong emergency number is dangerous), so there's no
 * "approximate" disclaimer here. Self-hides while loading, on error, and for
 * any uncurated country (backend 204 → hook resolves to null).
 */
const CountryFactsSection = ({ code }: CountryFactsSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);

    // Re-render once a minute so the local clock (and any offset that rolls
    // over a DST boundary) stays current without a page reload.
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((n) => n + 1), 60_000);
        return () => clearInterval(id);
    }, []);

    if (!data) return null;

    const { emergency, power, timezone, timezoneMulti } = data;

    const emergencyEntries = [
        ...EMERGENCY_ORDER.filter((k) => emergency[k]),
        ...Object.keys(emergency).filter(
            (k) => !EMERGENCY_ORDER.includes(k as (typeof EMERGENCY_ORDER)[number])
        ),
    ].map((key) => ({
        key,
        label: t(`countryFacts.emergency.${key}`, { defaultValue: key }),
        number: emergency[key],
    }));

    const plugText =
        power && power.plugs.length > 0
            ? t(
                  power.plugs.length === 1
                      ? 'countryFacts.power.plugsOne'
                      : 'countryFacts.power.plugsMany',
                  { letters: power.plugs.join(' / ') }
              )
            : null;

    const localTime = timezone ? localTimeIn(timezone) : null;
    const offset = timezone ? offsetHoursFromViewer(timezone) : null;
    let offsetText: string | null = null;
    if (offset !== null) {
        const rounded = Math.round(offset * 2) / 2;
        if (rounded === 0) {
            offsetText = t('countryFacts.time.same');
        } else {
            const abs = Math.abs(rounded);
            const h = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
            offsetText = t(
                rounded > 0
                    ? 'countryFacts.time.ahead'
                    : 'countryFacts.time.behind',
                { h }
            );
        }
    }

    const hasEmergency = emergencyEntries.length > 0;
    const hasPower = Boolean(power && plugText);
    const hasTime = Boolean(localTime);
    if (!hasEmergency && !hasPower && !hasTime) return null;

    return (
        <DetailSection
            className="country-facts-section"
            title={t('countryFacts.title')}
            icon={<FactCheckRoundedIcon />}
        >
            <ul className="country-facts-list">
                {hasEmergency && (
                    <li className="country-facts-row">
                        <LocalHospitalRoundedIcon className="country-facts-icon country-facts-icon--sos" />
                        <div className="country-facts-body">
                            <span className="country-facts-label">
                                {t('countryFacts.emergency.label')}
                            </span>
                            <ul className="country-facts-numbers">
                                {emergencyEntries.map((e) => (
                                    <li
                                        key={e.key}
                                        className="country-facts-number"
                                    >
                                        <span className="country-facts-number-val">
                                            {e.number}
                                        </span>
                                        <span className="country-facts-number-label">
                                            {e.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </li>
                )}

                {hasPower && power && (
                    <li className="country-facts-row">
                        <PowerRoundedIcon className="country-facts-icon" />
                        <div className="country-facts-body">
                            <span className="country-facts-label">
                                {t('countryFacts.power.label')}
                            </span>
                            <span className="country-facts-value">
                                {plugText}
                            </span>
                            <span className="country-facts-sub">
                                {t('countryFacts.power.spec', {
                                    voltage: power.voltage,
                                    frequency: power.frequency,
                                })}
                            </span>
                        </div>
                    </li>
                )}

                {hasTime && (
                    <li className="country-facts-row">
                        <ScheduleRoundedIcon className="country-facts-icon" />
                        <div className="country-facts-body">
                            <span className="country-facts-label">
                                {t('countryFacts.time.label')}
                            </span>
                            <span className="country-facts-value">
                                {localTime}
                                {offsetText && (
                                    <span className="country-facts-offset">
                                        {' · '}
                                        {offsetText}
                                    </span>
                                )}
                            </span>
                            {timezoneMulti && (
                                <span className="country-facts-sub">
                                    {t('countryFacts.time.multi')}
                                </span>
                            )}
                        </div>
                    </li>
                )}
            </ul>
        </DetailSection>
    );
};

export default CountryFactsSection;

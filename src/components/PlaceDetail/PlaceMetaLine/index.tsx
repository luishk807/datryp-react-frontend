import type { ReactNode } from 'react';
import CountryFlag from 'components/common/CountryFlag';
import './index.scss';

export interface PlaceMetaLineProps {
    /** ISO 3166-1 alpha-2 country code for the leading flag. Falls back to a
     *  globe icon when missing/invalid (handled by CountryFlag). */
    countryCode?: string | null;
    /** Country name — used as the flag's tooltip / alt text. */
    countryName?: string;
    /** Meta segments: geo context first (e.g. "Tinum · Mexico"), then optional
     *  labeled facts such as Language. Wrap each in a `.place-meta-seg` span. */
    children: ReactNode;
}

/**
 * The location/identity line shared by the city, country, and place detail
 * headers. Leads with the country flag, then a consistent row of meta
 * segments, so the three pages read the same way (flag → where it is →
 * language) instead of each formatting their location line differently.
 */
const PlaceMetaLine = ({
    countryCode,
    countryName,
    children,
}: PlaceMetaLineProps) => (
    <p className="place-meta-line">
        <CountryFlag code={countryCode} title={countryName} decorative />
        {children}
    </p>
);

export default PlaceMetaLine;

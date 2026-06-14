import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Country } from 'types';
import { useCountries } from 'api/hooks/useCountries';
import SearchBar from 'components/SearchBar';
import type { PlaceResult } from 'api/hooks/usePlaces';
import type { TransportDraft } from '../types';
import { TRANSPORT_MODE, buildTransportSummary } from '../transportSummary';
import './index.scss';

export interface ConfirmStepProps {
    country: Country | null;
    transport: TransportDraft;
    /** Jump back to step 2 (describe). */
    onEditTransport: () => void;
    /** Set the destination country when the user picks one from the
     *  fallback picker (auto-derivation didn't resolve a country). */
    onSetCountry: (country: Country) => void;
}

/** Step 3 — read-only review of the destination + transport the wizard
 *  collected. The destination is normally derived from the smart text /
 *  arrival airport by TransportResolver (always mounted). When that can't
 *  resolve a country (e.g. the smart text named a CITY, not a country),
 *  this step falls back to an explicit destination picker so the user can
 *  always satisfy the country gate and add the destination. */
const ConfirmStep = ({
    country,
    transport,
    onEditTransport,
    onSetCountry,
}: ConfirmStepProps) => {
    const { t } = useTranslation();
    const mode = transport.kind ? TRANSPORT_MODE[transport.kind] : null;
    const summary = buildTransportSummary(transport);

    // A picked place (city or country) resolves to a savable Country via the
    // countries catalog: a country pick looks itself up by name; a city pick
    // looks up its countryName. The async lookup runs only while a pick is
    // pending and no country is set yet.
    const [pendingName, setPendingName] = useState('');
    const { data: countryMatches } = useCountries(pendingName, {
        enabled: !country && pendingName.length > 0,
        limit: 1,
    });

    useEffect(() => {
        if (country || !pendingName) return;
        const best = countryMatches?.[0];
        if (!best) return;
        onSetCountry({
            id: best.id,
            name: best.name,
            code: best.code,
            local: best.local ?? undefined,
            image: best.image ?? undefined,
        });
        setPendingName('');
        // onSetCountry is stable; fire once per resolved match.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [countryMatches, country, pendingName]);

    const handlePlacePick = (place: PlaceResult) => {
        // Country pick → resolve by its own name; city pick → resolve via the
        // city's countryName. Either way the catalog lookup returns the
        // Country with the id we need to save.
        setPendingName(
            place.kind === 'country' ? place.name : place.countryName,
        );
    };

    return (
        <section className="add-destination-group confirm-step">
            <header className="add-destination-group-head">
                <h4 className="add-destination-group-title">
                    {t('addForms.transport.confirm.heading')}
                </h4>
            </header>

            <div className="confirm-row">
                <span className="confirm-row-label">
                    {t('addForms.transport.confirm.destination')}
                </span>
                <div className="confirm-row-body">
                    {country ? (
                        <span className="confirm-row-value">{country.name}</span>
                    ) : (
                        <div className="confirm-destination-picker">
                            <p className="confirm-destination-hint">
                                {t('addForms.transport.confirm.pickDestination')}
                            </p>
                            <SearchBar
                                mode="place"
                                type="simple"
                                onPlaceSelected={handlePlacePick}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="confirm-row">
                <span className="confirm-row-label">
                    {t('addForms.transport.confirm.gettingThere')}
                </span>
                <div className="confirm-row-body">
                    {mode ? (
                        <span className="confirm-row-value confirm-transport">
                            <span className="confirm-transport-mode">
                                <mode.Icon className="confirm-transport-icon" />
                                {t(
                                    `addForms.transport.mode.${mode.labelKey}`,
                                )}
                            </span>
                            {summary && (
                                <span className="confirm-transport-summary">
                                    {summary}
                                </span>
                            )}
                        </span>
                    ) : (
                        <span className="confirm-row-value confirm-row-muted">
                            {t('addForms.transport.confirm.addLater')}
                        </span>
                    )}
                    <button
                        type="button"
                        className="confirm-row-edit"
                        onClick={onEditTransport}
                    >
                        {t('addForms.transport.confirm.edit')}
                    </button>
                </div>
            </div>
        </section>
    );
};

export default ConfirmStep;

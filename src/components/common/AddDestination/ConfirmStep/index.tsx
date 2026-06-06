import type { Country } from 'types';
import type { TransportDraft } from '../TransportStep';
import { TRANSPORT_MODE, buildTransportSummary } from '../transportSummary';
import './index.scss';

export interface ConfirmStepProps {
    country: Country | null;
    transport: TransportDraft;
    /** Jump back to step 1 (destination picker). */
    onEditDestination: () => void;
    /** Jump back to step 2 (getting there). */
    onEditTransport: () => void;
}

/** Step 3 — read-only review of the destination + transport the wizard
 *  collected. The async route / country derivation is owned by
 *  TransportResolver (always mounted), so this card only renders state. */
const ConfirmStep = ({
    country,
    transport,
    onEditDestination,
    onEditTransport,
}: ConfirmStepProps) => {
    const mode = transport.kind ? TRANSPORT_MODE[transport.kind] : null;
    const summary = buildTransportSummary(transport);

    return (
        <section className="add-destination-group confirm-step">
            <header className="add-destination-group-head">
                <h4 className="add-destination-group-title">
                    Confirm your destination
                </h4>
            </header>

            <div className="confirm-row">
                <span className="confirm-row-label">Destination</span>
                <div className="confirm-row-body">
                    <span className="confirm-row-value">
                        {country?.name ?? 'Not set'}
                    </span>
                    <button
                        type="button"
                        className="confirm-row-edit"
                        onClick={onEditDestination}
                    >
                        Edit
                    </button>
                </div>
            </div>

            <div className="confirm-row">
                <span className="confirm-row-label">Getting there</span>
                <div className="confirm-row-body">
                    {mode ? (
                        <span className="confirm-row-value confirm-transport">
                            <span className="confirm-transport-mode">
                                <mode.Icon className="confirm-transport-icon" />
                                {mode.label}
                            </span>
                            {summary && (
                                <span className="confirm-transport-summary">
                                    {summary}
                                </span>
                            )}
                        </span>
                    ) : (
                        <span className="confirm-row-value confirm-row-muted">
                            You&rsquo;ll add this later
                        </span>
                    )}
                    <button
                        type="button"
                        className="confirm-row-edit"
                        onClick={onEditTransport}
                    >
                        Edit
                    </button>
                </div>
            </div>
        </section>
    );
};

export default ConfirmStep;

/**
 * Step 6 — Interests. Chip multi-select fed by `/me/interests-catalog`
 * so adding a new chip is a one-line change on the backend.
 */
import { useState } from 'react';
import classnames from 'classnames';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import {
    useInterestsCatalog,
    useUpdateMyPreferences,
} from 'api/hooks/useMyPreferences';
import './index.scss';

export interface StepInterestsProps {
    onContinue: () => void;
    onSkip: () => void;
}

const StepInterests = ({ onContinue, onSkip }: StepInterestsProps) => {
    const { data: catalog = [], isLoading } = useInterestsCatalog();
    const update = useUpdateMyPreferences();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const toggle = (slug: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(slug)) next.delete(slug);
            else next.add(slug);
            return next;
        });
        if (error) setError(null);
    };

    const handleContinue = async () => {
        if (selected.size === 0) {
            onSkip();
            return;
        }
        try {
            await update.mutateAsync({ interests: Array.from(selected) });
            onContinue();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not save your interests.'
            );
        }
    };

    return (
        <>
            <h1 className="signup-step-title">
                What kind of traveler are you?
            </h1>
            <p className="signup-step-subtitle">
                Pick a few — we'll use these to surface trips and places you
                might love.
            </p>
            <div className="signup-interests-grid" role="group">
                {isLoading && <p>Loading interests…</p>}
                {catalog.map((opt) => {
                    const active = selected.has(opt.slug);
                    return (
                        <button
                            key={opt.slug}
                            type="button"
                            className={classnames('signup-interest-chip', {
                                'is-active': active,
                            })}
                            aria-pressed={active}
                            onClick={() => toggle(opt.slug)}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
            {error && (
                <p className="signup-error" role="alert">
                    {error}
                </p>
            )}
            <div className="signup-step-actions">
                <ButtonCustom
                    type="none"
                    capitalizeType="none"
                    className="signup-primary-btn"
                    label={update.isPending ? 'Saving…' : 'Continue'}
                    onClick={handleContinue}
                    disabled={update.isPending}
                />
                <button
                    type="button"
                    className="signup-skip-link"
                    onClick={onSkip}
                >
                    Skip for now
                </button>
            </div>
        </>
    );
};

export default StepInterests;

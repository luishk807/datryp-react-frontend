import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './index.scss';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import StarInput from 'components/common/FormFields/StarInput';
import { BUTTON_VARIANT } from 'constants';

export interface ReviewFormProps {
    /** Existing rating when editing; defaults to 0 (no selection) for create. */
    initialRating?: number;
    /** Existing text when editing; empty string for create. */
    initialText?: string;
    /** True while the mutation is in flight — disables both buttons and
     *  swaps the primary label to "Saving…". */
    submitting?: boolean;
    /** Label for the primary action (e.g. "Post review" / "Update review"). */
    submitLabel: string;
    /** Called with the picked rating + trimmed text when the user submits. */
    onSubmit: (rating: number, text: string) => void;
    /** When provided, a secondary "Cancel" button is rendered. */
    onCancel?: () => void;
}

/**
 * Inline form used by `ReviewSection` for both create and edit flows. State
 * is local — the parent owns server submission via `onSubmit`. Validation
 * is intentionally minimal (rating in 1-5); the rest is enforced by the
 * backend Pydantic schema.
 */
const ReviewForm = ({
    initialRating = 0,
    initialText = '',
    submitting = false,
    submitLabel,
    onSubmit,
    onCancel,
}: ReviewFormProps) => {
    const { t } = useTranslation();
    const [rating, setRating] = useState(initialRating);
    const [text, setText] = useState(initialText);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        if (rating < 1 || rating > 5) {
            setError(t('detail.reviews.pickRating'));
            return;
        }
        setError(null);
        onSubmit(rating, text.trim());
    };

    return (
        <div className="review-form">
            <label className="review-form-row">
                <span className="review-form-label">
                    {t('detail.reviews.yourRating')}
                </span>
                <StarInput value={rating} onChange={setRating} size="lg" />
            </label>
            <label className="review-form-row">
                <span className="review-form-label">
                    {t('detail.reviews.yourThoughts')}
                </span>
                <textarea
                    className="review-form-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('detail.reviews.thoughtsPlaceholder')}
                    maxLength={4000}
                    rows={4}
                />
            </label>
            {error && (
                <p className="review-form-error" role="alert">
                    {error}
                </p>
            )}
            <div className="review-form-actions">
                {onCancel && (
                    <ButtonCustom
                        type={BUTTON_VARIANT.LINE}
                        label={t('common.cancel')}
                        onClick={onCancel}
                        disabled={submitting}
                    />
                )}
                <ButtonCustom
                    type={BUTTON_VARIANT.STANDARD}
                    label={submitting ? t('common.saving') : submitLabel}
                    onClick={handleSubmit}
                    disabled={submitting}
                />
            </div>
        </div>
    );
};

export default ReviewForm;

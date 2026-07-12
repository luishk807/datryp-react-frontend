import './index.scss';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';

export interface CurrencyTipsSectionProps {
    /** ISO-2 country code the money tips are curated / AI-generated for. */
    code: string;
}

const Stars = ({ rating, ariaLabel }: { rating: number; ariaLabel: string }) => (
    <span className="currency-tips-stars" role="img" aria-label={ariaLabel}>
        {[1, 2, 3, 4, 5].map((n) =>
            n <= rating ? (
                <StarRoundedIcon
                    key={n}
                    className="currency-tips-star is-on"
                />
            ) : (
                <StarBorderRoundedIcon key={n} className="currency-tips-star" />
            )
        )}
    </span>
);

/**
 * "Cards & cash" sidebar card — the day-to-day "how do I actually pay here?"
 * answer. Cards and cash show an at-a-glance 1-5 star rating (how card-friendly
 * / how cash-reliant); ATMs and Apple/Google Pay show a short note. Rows fall
 * back to their text value when a rating is missing (older cached rows).
 * Served on the same /country-facts payload. Self-hides when there's nothing.
 */
const CurrencyTipsSection = ({ code }: CurrencyTipsSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    const tips = data?.currencyTips;
    if (!tips) return null;

    const clamp = (r: number | null) =>
        r != null && r >= 1 && r <= 5 ? Math.round(r) : null;

    const rows = [
        {
            key: 'cards',
            label: t('currencyTips.cards'),
            rating: clamp(tips.cardsRating),
            text: tips.cards,
        },
        {
            key: 'cash',
            label: t('currencyTips.cash'),
            rating: clamp(tips.cashRating),
            text: tips.cash,
        },
        { key: 'atm', label: t('currencyTips.atm'), rating: null, text: tips.atm },
        {
            key: 'applePay',
            label: t('currencyTips.applePay'),
            rating: null,
            text: tips.applePay,
        },
    ].filter((row) => row.rating != null || row.text);
    if (rows.length === 0) return null;

    return (
        <DetailSection
            className="currency-tips-section"
            title={t('currencyTips.title')}
            icon={<CreditCardRoundedIcon />}
        >
            <ul className="currency-tips-list">
                {rows.map((row) => (
                    <li
                        key={row.key}
                        className={classNames('currency-tips-row', {
                            'is-rated': row.rating != null,
                        })}
                    >
                        <span className="currency-tips-label">{row.label}</span>
                        {row.rating != null ? (
                            <Stars
                                rating={row.rating}
                                ariaLabel={t('currencyTips.ratingAria', {
                                    rating: row.rating,
                                })}
                            />
                        ) : (
                            <span className="currency-tips-value">
                                {row.text}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </DetailSection>
    );
};

export default CurrencyTipsSection;

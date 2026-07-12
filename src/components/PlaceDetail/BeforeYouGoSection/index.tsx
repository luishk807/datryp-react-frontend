import './index.scss';
import { useTranslation } from 'react-i18next';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';

export interface BeforeYouGoSectionProps {
    /** The AI-assembled prep checklist. `undefined`/empty for cached rows that
     *  pre-date this field — the section then renders nothing. */
    items: string[] | undefined;
}

/**
 * "Before you go" checklist on a country / city / place detail page — the
 * handful of things a traveler should sort out before they fly (visa lead
 * time, power adapter, local cash/apps, jabs, booking ahead…). Rendered inline
 * in the main content column, borderless like the Essential-apps block, under
 * one quiet "starting point — confirm the specifics" note (never labelled as
 * AI, matching the page's disclaimer style). Self-hides when there are no
 * items, so consumers can drop it in without a guard.
 */
const BeforeYouGoSection = ({ items }: BeforeYouGoSectionProps) => {
    const { t } = useTranslation();
    const list = (items ?? []).map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return null;

    return (
        <DetailSection
            className="before-you-go-section"
            title={t('beforeYouGo.title')}
            icon={<ChecklistRoundedIcon />}
        >
            <ul className="before-you-go-list">
                {list.map((item) => (
                    <li key={item} className="before-you-go-item">
                        <CheckCircleRoundedIcon className="before-you-go-check" />
                        <span className="before-you-go-text">{item}</span>
                    </li>
                ))}
            </ul>
            <p className="before-you-go-note">{t('beforeYouGo.note')}</p>
        </DetailSection>
    );
};

export default BeforeYouGoSection;

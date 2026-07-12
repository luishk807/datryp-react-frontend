import './index.scss';
import { useTranslation } from 'react-i18next';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import type { HiddenGem } from 'types';

export interface HiddenGemsSectionProps {
    /** Lesser-known spots most visitors miss, from the details `prose` slice.
     *  `undefined`/empty for cached rows that pre-date this field — the section
     *  then renders nothing. */
    items: HiddenGem[] | undefined;
}

/**
 * "Hidden gems" on a country / city / place detail page — a short list of
 * lesser-known spots most visitors miss, each with one line on why it's worth
 * seeking out. Rendered inline in the main content column, borderless like the
 * "Before you go" and Essential-apps blocks. Self-hides when there are no gems,
 * so consumers can drop it in without a guard.
 */
const HiddenGemsSection = ({ items }: HiddenGemsSectionProps) => {
    const { t } = useTranslation();
    const gems = (items ?? []).filter((gem) => gem.name.trim());
    if (gems.length === 0) return null;

    return (
        <DetailSection
            className="hidden-gems-section"
            title={t('hiddenGems.title')}
            icon={<DiamondRoundedIcon />}
        >
            <ul className="hidden-gems-list">
                {gems.map((gem) => (
                    <li key={gem.name} className="hidden-gems-item">
                        <span className="hidden-gems-name">{gem.name}</span>
                        {gem.why.trim() && (
                            <span className="hidden-gems-why">{gem.why}</span>
                        )}
                    </li>
                ))}
            </ul>
        </DetailSection>
    );
};

export default HiddenGemsSection;

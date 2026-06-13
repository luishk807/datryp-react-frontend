import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import { useTranslation } from "react-i18next";
import SafetyWidget from "components/SafetyWidget";
import AsyncDetailSection from "components/PlaceDetail/AsyncDetailSection";
import type { SafetyInfo } from "types";

export interface SafetySectionProps {
  /** Resolved safety payload from the enriched query. `undefined` while
   *  loading — `AsyncDetailSection` shows a 3-line paragraph skeleton
   *  in its place. */
  safety: SafetyInfo | undefined;
  /** Whether the enriched query errored. When true the section shows
   *  an inline "Could not load safety." paragraph. */
  isError: boolean;
}

/**
 * "Safety" sidebar section. Wraps `AsyncDetailSection` with a shield
 * icon and renders `SafetyWidget` once the safety payload resolves.
 */
const SafetySection = ({ safety, isError }: SafetySectionProps) => {
  const { t } = useTranslation();
  return (
    <AsyncDetailSection
      title={t('detail.common.safety.title')}
      icon={<ShieldRoundedIcon />}
      data={safety}
      isError={isError}
      errorMessage={t('detail.common.safety.error')}
      loadingHint={t('detail.common.safety.loading')}
      skeletonLines={3}
    >
      {(info) => <SafetyWidget info={info} />}
    </AsyncDetailSection>
  );
};

export default SafetySection;

import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import { useTranslation } from "react-i18next";
import CurrencyWidget from "components/CurrencyWidget";
import AsyncDetailSection from "components/PlaceDetail/AsyncDetailSection";
import type { CurrencyInfo } from "types";

export interface CurrencySectionProps {
  /** Resolved currency payload from the enriched query. `undefined`
   *  while loading — `AsyncDetailSection` shows a 2-line paragraph
   *  skeleton in its place. */
  currency: CurrencyInfo | undefined;
  /** Whether the enriched query errored. When true the section shows
   *  an inline "Could not load currency." paragraph. */
  isError: boolean;
}

/**
 * "Currency" sidebar section. Wraps `AsyncDetailSection` with a dollar
 * icon and renders `CurrencyWidget` once the currency payload resolves.
 */
const CurrencySection = ({ currency, isError }: CurrencySectionProps) => {
  const { t } = useTranslation();
  return (
    <AsyncDetailSection
      title={t('detail.common.currency.title')}
      icon={<PaidRoundedIcon />}
      data={currency}
      isError={isError}
      errorMessage={t('detail.common.currency.error')}
      loadingHint={t('detail.common.currency.loading')}
      skeletonLines={2}
    >
      {(info) => <CurrencyWidget info={info} />}
    </AsyncDetailSection>
  );
};

export default CurrencySection;

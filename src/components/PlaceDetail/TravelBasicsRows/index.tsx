import { useTranslation } from "react-i18next";
import LocalTaxiRoundedIcon from "@mui/icons-material/LocalTaxiRounded";
import DirectionsBusRoundedIcon from "@mui/icons-material/DirectionsBusRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import CakeRoundedIcon from "@mui/icons-material/CakeRounded";
import InfoRowList, {
  InfoRowListSkeleton,
  type InfoRow,
} from "components/PlaceDetail/InfoRowList";
import type { TravelBasics } from "types";

const PAYMENT_LABEL_KEY: Record<TravelBasics["paymentMethod"], string> = {
  cash: "detail.common.travelBasics.paymentCash",
  card: "detail.common.travelBasics.paymentCard",
  mixed: "detail.common.travelBasics.paymentMixed",
};

export interface TravelBasicsRowsProps {
  basics: TravelBasics;
}

const TravelBasicsRows = ({ basics }: TravelBasicsRowsProps) => {
  const { t } = useTranslation();
  const rows: InfoRow[] = [
    {
      icon: <LocalTaxiRoundedIcon />,
      label: t('detail.common.travelBasics.gettingAround'),
      value: basics.preferredTransport,
    },
    {
      icon: <DirectionsBusRoundedIcon />,
      label: t('detail.common.travelBasics.transitSystem'),
      value: basics.transportSystem,
    },
    {
      icon: <CreditCardRoundedIcon />,
      label: t('detail.common.travelBasics.payment'),
      value: (
        <>
          <strong>{t(PAYMENT_LABEL_KEY[basics.paymentMethod])}</strong>
          <span className="info-rows-sub"> — {basics.paymentNote}</span>
        </>
      ),
      valueText: `${t(PAYMENT_LABEL_KEY[basics.paymentMethod])} — ${basics.paymentNote}`,
    },
    {
      icon: <TranslateRoundedIcon />,
      label: t('detail.common.travelBasics.language'),
      value: basics.language,
    },
    {
      icon: <CelebrationRoundedIcon />,
      label: t('detail.common.travelBasics.vibe'),
      value: basics.vibe,
    },
    {
      icon: <GroupsRoundedIcon />,
      label: t('detail.common.travelBasics.goodFor'),
      value: basics.audience,
    },
    {
      icon: <CakeRoundedIcon />,
      label: t('detail.common.travelBasics.ageRange'),
      value: basics.ageRecommendation,
    },
  ];

  return <InfoRowList rows={rows} />;
};

export const TravelBasicsSkeleton = () => <InfoRowListSkeleton rows={7} />;

export default TravelBasicsRows;

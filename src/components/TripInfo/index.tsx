import { Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Layout from 'components/common/Layout/SubLayout';
import DestinationDetail from 'components/DestinationDetail';
import type { TripState } from 'types';
import './index.scss';

interface TripInfoProps {
    data: TripState;
}

const TripInfo = ({ data }: TripInfoProps) => {
    const { t } = useTranslation();
    return (
        <Layout>
            <Grid container className="tripInfo">
                <Grid item lg={12} md={12} xs={12}>
                    <Grid container className="header">
                        <Grid item lg={6} md={6} xs={6} className="title">
                          {t('tripDetail.info.tripName', { name: data.name })}
                        </Grid>
                        <Grid item lg={6} md={6} xs={6} className="menu">
                          {t('tripDetail.info.edit')}
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item lg={12} md={12} xs={12}>
                    <hr />
                </Grid>
                <Grid item lg={12} md={12} xs={12}>
                    <Grid container className="tripData">
                        <Grid item lg={6} md={6} xs={12} className="data">
                            <ul>
                                <li>
                                    <span className="title">{t('tripDetail.info.budget')}</span>
                                    <span>${data.budget}</span>
                                </li>
                                <li>
                                    <span className="title">{t('tripDetail.info.total')}</span>
                                    <span>${data.total}</span>
                                </li>
                                <li>
                                    <span className="title">{t('tripDetail.info.date')}</span>
                                    <span>{`${data.startDate} - ${data.endDate}`}</span>
                                </li>
                                <li>
                                    <span className="title">{t('tripDetail.info.people')}</span>
                                    <span>{data.people}</span>
                                </li>
                            </ul>
                        </Grid>
                        <Grid item lg={6} md={6} xs={12} className="status">
                          {t('tripDetail.info.completed')}
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item lg={12} md={12} className="tripItems">
                    <DestinationDetail
                        startDate={data.startDate}
                        endDate={data.endDate}
                        type={data.type}
                        destinations={data.destinations}
                        onChangeBudget={() => {}}
                        onChangePlace={() => {}}
                    />
                </Grid>
            </Grid>
        </Layout>
    );
};

export default TripInfo;

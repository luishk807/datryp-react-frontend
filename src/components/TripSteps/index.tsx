import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, IconButton, Tooltip } from '@mui/material';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import Layout from 'components/common/Layout/SubLayout';
import DestinationDetail from 'components/DestinationDetail';
import StepperComp from 'components/common/StepperComp';
import BasicInfo from 'components/DestinationDetail/BasicInfo';
import FriendPicker from 'components/DestinationDetail/FriendPicker';
import { useTripState } from 'context/TripContext';
import { TRIP_BASIC } from 'constants';
import type {
    Friend,
    TripChangeEvent,
    TripDestinationEvent,
    TripPlaceEvent,
} from 'types';

type TripMode = 'single' | 'multiple';

interface TripStepsProps {
    title: string;
    containerClassName?: string;
    currentType: TripMode;
    onBasicChange: (id: string, e: TripChangeEvent) => void;
    onChangePlace: (event: TripPlaceEvent) => void;
    onChangeBudget: (event: TripPlaceEvent) => void;
    onChangeDestination?: (event: TripDestinationEvent) => void;
}

const TripSteps = ({
    title,
    containerClassName,
    currentType,
    onBasicChange,
    onChangePlace,
    onChangeBudget,
    onChangeDestination,
}: TripStepsProps) => {
    const tripInfo = useTripState();
    const navigate = useNavigate();

    const otherMode: TripMode = currentType === 'single' ? 'multiple' : 'single';
    const switchTarget =
        otherMode === 'single' ? TRIP_BASIC.SINGLE.route : TRIP_BASIC.MULTIPLE.route;
    const switchLabel =
        otherMode === 'single' ? 'Switch to Single Trip' : 'Switch to Multi Trip';

    const participants = useMemo<Friend[]>(() => {
        const friends = tripInfo.friends || [];
        const organizer = tripInfo.organizer || [];
        const merged = [...friends, ...organizer];

        const unique: Friend[] = [];
        merged.forEach((entry) => {
            if (!unique.find((u) => u.id === entry.id)) {
                unique.push(entry);
            }
        });
        return unique;
    }, [tripInfo]);

    const steps = [
        {
            label: 'Describe Your Trip!',
            comp: <BasicInfo data={tripInfo} onChange={onBasicChange} />,
        },
        {
            label: 'Define the Trips',
            comp: (
                <FriendPicker
                    name="friends"
                    selectedOptions={tripInfo.friends}
                    onChange={onBasicChange}
                />
            ),
        },
        {
            label: 'Finish',
            comp: (
                <DestinationDetail
                    type={tripInfo.type}
                    startDate={tripInfo.startDate}
                    participants={participants}
                    endDate={tripInfo.endDate}
                    destinations={tripInfo.destinations}
                    onChangePlace={onChangePlace}
                    onChangeBudget={onChangeBudget}
                    onChangeDestination={onChangeDestination}
                />
            ),
        },
    ];

    return (
        <Layout
            title={title}
            titleAction={
                <Tooltip title={switchLabel}>
                    <IconButton
                        size="small"
                        aria-label={switchLabel}
                        onClick={() => navigate(switchTarget)}
                        sx={{ ml: 1 }}
                    >
                        <SyncAltIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            }
        >
            <Grid container className={containerClassName}>
                <Grid item lg={12} md={12} xs={12}>
                    <StepperComp data={tripInfo} steps={steps} />
                </Grid>
            </Grid>
        </Layout>
    );
};

export default TripSteps;

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import moment from 'moment';
import _ from 'lodash';
import { 
    Grid,
} from '@mui/material';
import { convertMoney } from 'utils';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
ButtonIcon;
export const BasicTripInfo = ({
    data,
    onChangeStep
}) => {
    console.log("in basic trip:", data);
    const tripDate = useMemo(() => {
        const date1 = moment(data.startDate).format('MMMM Do YYYY').toString();
        const date2 = moment(data.endDate).format('MMMM Do YYYY').toString();
        
        return `From ${date1} to ${date2}`; 
    }, [data]);

    const organizer = useMemo(() => {
        return data.organizer.map(item => item.label).join(', ');
    }, [data]);
    return(
        <Grid container className="basic-trip-info">
            <Grid item lg={11} md={11}>
                <Grid container>
                    <Grid item lg={12} md={12} xs={12} className="item title">
                        <div className="data">Trip Information</div>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="item name">
                        <div className="label">Name for trip:</div>
                        <div className="data">{ data.name }</div>
                    </Grid>
                    <Grid item lg={6} md={6} xs={12}>
                        <Grid container>
                            <Grid item lg={12} md={12} xs={12}className="item">
                                <div className="label">Organizer:</div>
                                <div className="data">{ organizer }</div>
                            </Grid>
                            <Grid item lg={12} md={12} xs={12} className="item">
                                
                                <div className="label">When?:</div>
                                <div className="data">{ tripDate }</div>
                            </Grid>
        
                            <Grid item lg={12} md={12} xs={12} className="item">
                                <div className="label">How much?:</div>
                                <div className="data">{ convertMoney(data.budget)}</div>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item lg={6} md={6} xs={12} className="item">
                        <div className="label">Who is Going?:</div>
                        <div className="data">
                            <ul>
                                {
                                    data.friends && data.friends.map((item, indx) => {
                                        return (<li key={indx}>{item.label}</li>);
                                    })
                                }
                            </ul>
                        </div>
                    </Grid>
                </Grid>
            </Grid>
            <Grid item lg={1} md={1} className="status">
                <div className="label">Status&nbsp;[<ButtonIcon onClick={(e) => onChangeStep(0)} title="edit" type="text" />]:</div>
                <div className="data">{ _.get(data, 'status.name') }</div>
            </Grid>
        </Grid>
    );
};

BasicTripInfo.propTypes = {
    data: PropTypes.object,
    onChangeStep: PropTypes.func,
};

export default BasicTripInfo;
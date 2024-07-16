import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import ModalButton from 'components/ModalButton';
import { Grid } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';

export const AddBudget = ({
    participants = []
}) => {
    const [budget, setBudget] = useState([]);
    console.log("parti", participants);
    const handleSubmit = () => {
        console.log("submit");
        console.log("budget",budget);
        //onChange('budget', budget)
    };

    const handleOnChange = (item, e) => {
        console.log("budget", budget);
        console.log("on chnage", item);
        const { value } = e.target;
        const budgetList = budget || [];

        const new_budget = {
            ...item,
            ['budget']: value
        };
        if (!budgetList.length) {
            console.log("empty");
            budgetList.push(new_budget);
        } else {
            console.log("not empty");
            let foundIndx = null;

            
            for(let i = 0; i < budgetList.length; i++) {
                if (budgetList[i] && (budgetList[i].id === new_budget.id)) {
                    foundIndx = i;
                    break;
                }
            }

            if (foundIndx) {
                budgetList[foundIndx] = new_budget;
            } else {
                budgetList.push(new_budget);
            }

        }
        
        setBudget(budgetList);
    };


    return(
        <ModalButton
            title="Travel Budget"
            buttonProps={{
                Icon: AddCircleOutlineIcon,
                type: "text-plain"
            }}
        >
            <Grid container className="travel-budget">
                <Grid item lg={12} xs={12} md={12} className="description">
                    Update budget for each friend
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="items">
                    {
                        participants && participants.map((item, indx) => {
                            return (
                                <Grid container key={indx} className="item">
                                    <Grid item lg={7} xs={7} md={7} className="label">{item.label}</Grid>
                                    <Grid item lg={5} xs={5} md={5} className="data"><InputField name="budget" onChange={(e) => handleOnChange(item, e)} type="number" /></Grid>
                                </Grid>
                            );
                        })
                    }
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="button-container">
                    <ButtonCustom 
                        onClick={handleSubmit} 
                        label={'Save Budget'} 
                        type="standard"
                        capitalizeType="uppercase"
                    />
                </Grid>
            </Grid>
        </ModalButton>
    );
};

AddBudget.propTypes = {
    participants: PropTypes.array
};

export default AddBudget;
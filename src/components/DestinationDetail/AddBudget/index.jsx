import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import ModalButton from 'components/ModalButton';
import { Grid } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';

export const AddBudget = ({
    participants = [],
    onSubmit,
    budget = []
}) => {
    const [newBudget, setNewBudget] = useState([]);

    console.log("party involved", participants);
    
    const handleSubmit = () => {
        console.log("submit", newBudget);
        onSubmit(newBudget);
    };

    const handleOnChange = (item, e) => {
        const { value } = e.target;
        let budgetList = newBudget;

        const new_budget = {
            ...item,
            ['budget']: value
        };
        let foundIndx = null;

        if (!budgetList.length) {
            budgetList.push(new_budget);
        } else {
            for(let i = 0; i < budgetList.length; i++) {
                if (budgetList[i] && (budgetList[i].id === new_budget.id)) {
                    foundIndx = i;
                    budgetList[i].budget = value;
                    break;
                }
            }

            if (foundIndx < 0 || foundIndx === null ) {
                budgetList.push(new_budget);
            }
        }
        const filterBudget = budgetList.filter(item => item.budget > 0);
        setNewBudget(filterBudget);
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
                        participants && participants.map((participant, indx) => {
                            const foundItem = budget.length ? budget.filter(item => item.id === participant.id)[0] : null;
                            return (
                                <Grid container key={indx} className="item">
                                    <Grid item lg={7} xs={7} md={7} className="label">{participant.label}</Grid>
                                    <Grid item lg={5} xs={5} md={5} className="data"><InputField name="budget" defaultValue={foundItem ? foundItem.budget : null} onChange={(e) => handleOnChange(participant, e)} type="number" /></Grid>
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
    participants: PropTypes.array,
    onSubmit: PropTypes.func,
    budget: PropTypes.array
};

export default AddBudget;
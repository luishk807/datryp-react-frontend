import React, { useRef, useState } from 'react';
import './index.css';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import { Grid } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import type { BudgetEntry, BudgetItem, Friend } from 'types/trip';

interface AddBudgetProps {
    participants?: Friend[];
    budget?: BudgetItem[];
    onSubmit: (entries: BudgetEntry[]) => void;
    isViewMode?: boolean;
}

const toNumber = (value: string | number): number => {
    const n = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(n) ? n : 0;
};

export const AddBudget = ({
    participants = [],
    onSubmit,
    budget = [],
    isViewMode = false,
}: AddBudgetProps) => {
    const modalRef = useRef<ModalButtonHandle>(null);
    const [newBudget, setNewBudget] = useState<BudgetEntry[]>(() =>
        budget.map(({ user, budget: b }) => ({ user, budget: b }))
    );

    const handleOnChange = (user: Friend, e: { target: { value: string } }) => {
        const { value } = e.target;
        setNewBudget((prev) => {
            const without = prev.filter((b) => b.user.id !== user.id);
            const numeric = toNumber(value);
            if (numeric <= 0) return without;
            return [...without, { user, budget: value }];
        });
    };

    const handleSubmit = () => {
        onSubmit(newBudget);
        modalRef.current?.closeModal();
    };

    const total = newBudget.reduce((sum, b) => sum + toNumber(b.budget), 0);

    if (isViewMode) return null;

    return (
        <ModalButton
            ref={modalRef}
            title="Travel Budget"
            buttonProps={{
                Icon: AddCircleOutlineIcon,
                type: 'text-plain',
            }}
        >
            <Grid container className="travel-budget">
                <Grid item lg={12} xs={12} md={12} className="description">
                    Update budget for each friend
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="items">
                    {participants.map((participant) => {
                        const existing = budget.find((b) => b.user.id === participant.id);
                        return (
                            <Grid container key={participant.id} className="item">
                                <Grid item lg={7} xs={7} md={7} className="label">
                                    {participant.label}
                                </Grid>
                                <Grid item lg={5} xs={5} md={5} className="data">
                                    <InputField
                                        name="budget"
                                        defaultValue={existing ? String(existing.budget) : ''}
                                        onChange={(e) => handleOnChange(participant, e)}
                                        type="number"
                                    />
                                </Grid>
                            </Grid>
                        );
                    })}
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="total">
                    Total: {total.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                    })}
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="button-container">
                    <ButtonCustom
                        onClick={handleSubmit}
                        label="Save Budget"
                        type="standard"
                        capitalizeType="uppercase"
                    />
                </Grid>
            </Grid>
        </ModalButton>
    );
};

export default AddBudget;

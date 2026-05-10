import React, { forwardRef, useState } from 'react';
import { Grid } from '@mui/material';
import ModalButton, { type ModalButtonHandle } from '../../ModalButton';
import InputField from '../../common/FormFields/InputField';
import ButtonCustom from '../../common/FormFields/ButtonCustom';

export interface NewFriendInput {
    firstName?: string;
    lastName?: string;
    dob?: string;
    email?: string;
    phone?: string;
}

export interface AddFriendBtnProps {
    onChange?: (friend: NewFriendInput | null) => void;
}

const AddFriendBtn = forwardRef<ModalButtonHandle, AddFriendBtnProps>(({
    onChange
}, ref) => {
    const title = "Add Friend";
    const [friend, setFriend] = useState<NewFriendInput | null>(null);
    const handleOnChange = (fieldName: keyof NewFriendInput, value: string) => {
        setFriend((prev) => ({
            ...(prev ?? {}),
            [fieldName]: value,
        }));
    };

    const handleSubmit = (e: React.MouseEvent) => {
        e.preventDefault();
        onChange && onChange(friend);
    };


    return (
        <Grid container>
            <Grid item>
                <ModalButton 
                    ref={ref}
                    title={title}>
                    <Grid container>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField label="First Name" name="firstName" onChange={(e) => handleOnChange('firstName', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField label="Last Name" name="lastName" onChange={(e) => handleOnChange('lastName', e.target.value)}/>
                        </Grid>

                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField type="date" label="Date of birth" name="dob" onChange={(e) => handleOnChange('dob', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField label="Email" name="email" onChange={(e) => handleOnChange('email', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField label="Phone" name="phone" onChange={(e) => handleOnChange('phone', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12}>
                            <ButtonCustom 
                                onClick={handleSubmit} 
                                label={title} 
                                type="standard" 
                                capitalizeType="uppercase"
                            />
                        </Grid>
                    </Grid>
                </ModalButton>
            </Grid>
        </Grid>
    );
});

AddFriendBtn.displayName = "AddFriendBtn";

export default AddFriendBtn;
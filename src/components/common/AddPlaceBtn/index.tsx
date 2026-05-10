import { useState, useMemo, useRef, useEffect } from 'react';
import { Grid } from '@mui/material';
import moment from 'moment';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import DropdownCustom, { type DropdownOption } from 'components/common/FormFields/DropDown';
import { placeStatus } from 'sample';
import classNames from 'classnames';
import { TRIP_BASIC } from 'constants';
import './index.css';
import type { Activity, Friend, ImageRef } from 'types/trip';

type AddPlaceType = 'add' | 'edit';
type AddPlaceButtonType = 'text' | 'standard';

interface PlaceDraft {
    id?: number;
    place?: string;
    location?: string;
    cost?: string | number;
    startTime?: string;
    endTime?: string;
    note?: string;
    status?: DropdownOption;
    image?: ImageRef;
    friends?: Friend[];
}

export interface AddPlaceBtnProps {
    onChange?: (place: PlaceDraft) => void;
    type?: AddPlaceType;
    data?: Activity | null;
    tripTypeId?: number;
    buttonType?: AddPlaceButtonType;
    isViewMode?: boolean;
}

const AddPlaceBtn = ({
    onChange,
    type = 'add',
    data = null,
    tripTypeId,
    buttonType = 'standard',
    isViewMode = false,
}: AddPlaceBtnProps) => {
    const modelRef = useRef<ModalButtonHandle>(null);

    const initilStatus = useMemo<DropdownOption>(() => {
        const selected =
            data && typeof data.status === 'object' && data.status
                ? data.status.id
                : 3;
        return placeStatus.find((item) => item.id === selected) ?? placeStatus[0];
    }, [data]);

    const isAdd = type === 'add';

    const buildInitialPlace = (): PlaceDraft => ({
        startTime: moment().format('HH:mm'),
        endTime: moment().format('HH:mm'),
        status: initilStatus,
    });

    const [place, setPlace] = useState<PlaceDraft>(buildInitialPlace);
    const [formKey, setFormKey] = useState(0);

    const handleOnChange = <K extends keyof PlaceDraft>(name: K, value: PlaceDraft[K] | Friend) => {
        setPlace((prev) => {
            if (name === 'friends') {
                const next = Array.isArray(prev.friends)
                    ? [...prev.friends, value as Friend]
                    : [value as Friend];
                return { ...prev, friends: next };
            }
            return { ...prev, [name]: value as PlaceDraft[K] };
        });
    };

    const handleImageChange = (e: { target: { value: string } } | React.ChangeEvent<HTMLInputElement>) => {
        const target = (e as React.ChangeEvent<HTMLInputElement>).target;
        const file = target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            handleOnChange('image', { url: String(reader.result), name: file.name });
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        modelRef.current?.closeModal();
        onChange?.(place);
        if (type === 'add') {
            setPlace(buildInitialPlace());
            setFormKey((k) => k + 1);
        }
    };

    useEffect(() => {
        if (data && type === 'edit') {
            setPlace({
                id: data.id,
                place: data.place,
                startTime: data.startTime || moment().format('HH:mm'),
                endTime: data.endTime || moment().format('HH:mm'),
                location: data.location,
                cost: data.cost,
                note: data.note,
                status:
                    data.status && typeof data.status === 'object'
                        ? (data.status as DropdownOption)
                        : initilStatus,
                image: data.image,
            });
        } else {
            setPlace(buildInitialPlace());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, type]);

    if (isViewMode) return null;

    return (
        <Grid
            container
            className={classNames({
                'add-place-container-standard': buttonType === 'standard',
                'add-place-container-simple': buttonType === 'text',
            })}
        >
            <Grid
                item
                lg={12}
                md={12}
                xs={12}
                className={classNames({
                    'place-left': tripTypeId === TRIP_BASIC.MULTIPLE.id,
                })}
            >
                <ModalButton
                    ref={modelRef}
                    title={isAdd ? 'Add Place' : 'Edit ' + (data?.place ?? '')}
                    buttonProps={{
                        title: isAdd ? 'Add Place' : 'Edit',
                        Icon: buttonType === 'standard' ? AddCircleIcon : null,
                        type: buttonType,
                    }}
                >
                    <Grid container key={formKey}>
                        <Grid item lg={12} md={12} xs={12} id="add-place-form-container">
                            <Grid container>
                                <Grid item lg={12} xs={12} className="py-5">
                                    <InputField
                                        defaultValue={place.place}
                                        label="Name of Place"
                                        name="place"
                                        onChange={(e) => handleOnChange('place', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={12} xs={12} className="py-5">
                                    <InputField
                                        defaultValue={place.location}
                                        name="location"
                                        onChange={(e) => handleOnChange('location', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={12} xs={12} className="py-5">
                                    <InputField
                                        defaultValue={place.cost ? String(place.cost) : ''}
                                        name="cost"
                                        onChange={(e) => handleOnChange('cost', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={6} xs={12} className="py-5">
                                    <InputField
                                        defaultValue={place.startTime}
                                        name="startTime"
                                        type="time"
                                        label="Start Time"
                                        onChange={(e) => handleOnChange('startTime', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                    <InputField
                                        defaultValue={place.endTime}
                                        name="endTime"
                                        type="time"
                                        label="End Time"
                                        onChange={(e) => handleOnChange('endTime', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={12} xs={12} className="py-5">
                                    <InputField
                                        defaultValue={place.note}
                                        name="note"
                                        onChange={(e) => handleOnChange('note', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={12} xs={12} className="py-5">
                                    <InputField
                                        type="file"
                                        label="image"
                                        name="image"
                                        onChange={handleImageChange}
                                    />
                                </Grid>
                                <Grid item lg={12} xs={12} className="py-5">
                                    <DropdownCustom
                                        defaultValue={initilStatus}
                                        label="Status"
                                        options={placeStatus}
                                        onChange={(option) => handleOnChange('status', option)}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item lg={12} md={12} xs={12}>
                            <ButtonCustom
                                onClick={handleSubmit}
                                label={isAdd ? 'Add Place' : 'Save Place'}
                                type="standard"
                                capitalizeType="uppercase"
                            />
                        </Grid>
                    </Grid>
                </ModalButton>
            </Grid>
        </Grid>
    );
};

export default AddPlaceBtn;

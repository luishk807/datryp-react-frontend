import { useState, useRef, useEffect } from 'react';
import { Grid } from '@mui/material';
import { now } from 'utils';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ErrorAlert from 'components/common/ErrorAlert';
import { type DropdownOption } from 'components/common/FormFields/DropDown';
import classNames from 'classnames';
import { ACTION, BUTTON_VARIANT, TRIP_BASIC } from 'constants';
import './index.scss';
import type { Activity, AddEditButtonProps, Friend, ImageRef } from 'types';

const PLACE_LABEL = {
    ADD: 'Add Place',
    EDIT: 'Edit',
    SAVE: 'Save Place',
} as const;

interface PlaceDraft {
    id?: number;
    name?: string;
    location?: string;
    cost?: string | number;
    startTime?: string;
    endTime?: string;
    note?: string;
    status?: DropdownOption;
    image?: ImageRef;
    friends?: Friend[];
}

export interface AddPlaceBtnProps extends AddEditButtonProps<PlaceDraft, Activity> {
    tripTypeId?: number;
}

const AddPlaceBtn = ({
    onChange,
    type = ACTION.ADD,
    data = null,
    tripTypeId,
    buttonType = BUTTON_VARIANT.STANDARD,
    isViewMode = false,
}: AddPlaceBtnProps) => {
    const modelRef = useRef<ModalButtonHandle>(null);

    const isAdd = type === ACTION.ADD;

    // Preserve an existing place's status on edit; leave undefined on add so
    // the activity card defaults to the "Planning" badge. The toggle on the
    // card flips to a real UUID-bearing status once the user clicks it.
    const existingStatus: DropdownOption | undefined =
        data && typeof data.status === 'object' && data.status
            ? (data.status as DropdownOption)
            : undefined;

    const buildInitialPlace = (): PlaceDraft => ({
        startTime: now('HH:mm'),
        endTime: now('HH:mm'),
        status: existingStatus,
    });

    const [place, setPlace] = useState<PlaceDraft>(buildInitialPlace);
    const [formKey, setFormKey] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleOnChange = <K extends keyof PlaceDraft>(name: K, value: PlaceDraft[K] | Friend) => {
        setError(null);
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
        const missing: string[] = [];
        if (!place.name?.trim()) missing.push('name of place');
        if (!place.location?.trim()) missing.push('location');
        if (!place.startTime?.trim()) missing.push('start time');
        if (!place.endTime?.trim()) missing.push('end time');
        if (missing.length) {
            setError(`Please provide ${missing.join(', ')}.`);
            return;
        }
        setError(null);
        modelRef.current?.closeModal();
        onChange?.(place);
        if (type === ACTION.ADD) {
            setPlace(buildInitialPlace());
            setFormKey((k) => k + 1);
        }
    };

    useEffect(() => {
        setError(null);
        if (data && type === ACTION.EDIT) {
            setPlace({
                id: data.id,
                name: data.name,
                startTime: data.startTime || now('HH:mm'),
                endTime: data.endTime || now('HH:mm'),
                location: data.location,
                cost: data.cost,
                note: data.note,
                status:
                    data.status && typeof data.status === 'object'
                        ? (data.status as DropdownOption)
                        : undefined,
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
                'add-place-container-standard': buttonType === BUTTON_VARIANT.STANDARD,
                'add-place-container-simple': buttonType === BUTTON_VARIANT.TEXT,
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
                    title={isAdd ? PLACE_LABEL.ADD : `${PLACE_LABEL.EDIT} ${data?.name ?? ''}`}
                    buttonProps={{
                        title: isAdd ? PLACE_LABEL.ADD : PLACE_LABEL.EDIT,
                        Icon: buttonType === BUTTON_VARIANT.STANDARD ? AddCircleIcon : null,
                        type: buttonType,
                    }}
                >
                    <Grid container key={formKey}>
                        <Grid item lg={12} md={12} xs={12} id="add-place-form-container">
                            <Grid container>
                                <Grid item lg={12} xs={12} className="py-5">
                                    <InputField
                                        defaultValue={place.name}
                                        label="Name of Place"
                                        name="name"
                                        onChange={(e) => handleOnChange('name', e.target.value)}
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
                            </Grid>
                        </Grid>
                        {error && (
                            <Grid item lg={12} md={12} xs={12}>
                                <ErrorAlert>{error}</ErrorAlert>
                            </Grid>
                        )}
                        <Grid item lg={12} md={12} xs={12}>
                            <ButtonCustom
                                onClick={handleSubmit}
                                label={isAdd ? PLACE_LABEL.ADD : PLACE_LABEL.SAVE}
                                type={BUTTON_VARIANT.STANDARD}
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

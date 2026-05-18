import { useState, useRef, useEffect, type ComponentType } from 'react';
import { Grid } from '@mui/material';
import { now } from 'utils';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ErrorAlert from 'components/common/ErrorAlert';
import PlaceAutocomplete, {
    type PlaceSuggestion,
} from 'components/common/PlaceAutocomplete';
import { type DropdownOption } from 'components/common/FormFields/DropDown';
import classNames from 'classnames';
import { ACTION, BUTTON_VARIANT, TRIP_BASIC } from 'constants';
import './index.scss';
import type { Activity, AddEditButtonProps, Friend, ImageRef } from 'types';

const PLACE_LABEL = {
    ADD: 'Add Activity',
    EDIT: 'Edit',
    SAVE: 'Save Activity',
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
    /** Country scope for the AI autocomplete — keeps a Spain trip from
     *  suggesting the Eiffel Tower. Omit for a global search. */
    countryScope?: string;
    /** When set, the modal trigger renders as an icon-only button with
     *  this icon (no text label). Use for inline edit affordances next to
     *  an activity title. Falls back to the text/standard button when omitted. */
    triggerIcon?: ComponentType<{ fontSize?: 'inherit' | 'small' | 'medium' | 'large' }>;
    /** Optional class for the modal trigger — used by inline edit pencils
     *  that want compact MUI IconButton-style padding. */
    triggerClassName?: string;
}

const AddPlaceBtn = ({
    onChange,
    type = ACTION.ADD,
    data = null,
    tripTypeId,
    countryScope,
    triggerIcon,
    triggerClassName,
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

    /** AI suggestion picked from PlaceAutocomplete — prefill name + location
     *  + image in one go. The user can still edit any of them before saving. */
    const handlePlacePicked = (suggestion: PlaceSuggestion) => {
        setError(null);
        setPlace((prev) => ({
            ...prev,
            name: suggestion.name,
            location: suggestion.location,
            image: suggestion.imageUrl
                ? { url: suggestion.imageUrl, name: suggestion.name }
                : prev.image,
        }));
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
        // Activities don't have to be places — a "checkout at 10am" note is
        // a valid activity, so location is optional. Only the bare minimum
        // (name + time window) is required to keep the timeline coherent.
        if (!place.name?.trim()) missing.push('name');
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

    const modalElement = (
        <ModalButton
            ref={modelRef}
            title={isAdd ? PLACE_LABEL.ADD : `${PLACE_LABEL.EDIT} ${data?.name ?? ''}`}
            buttonProps={
                triggerIcon
                    ? {
                          // Icon-only trigger — no text label so it sits
                          // tight next to an activity title.
                          title: '',
                          Icon: triggerIcon,
                          type: BUTTON_VARIANT.TEXT_PLAIN,
                          className: triggerClassName,
                          iconProps: { fontSize: 'small' },
                          ariaLabel: isAdd
                              ? PLACE_LABEL.ADD
                              : `${PLACE_LABEL.EDIT} ${data?.name ?? ''}`,
                      }
                    : {
                          title: isAdd ? PLACE_LABEL.ADD : PLACE_LABEL.EDIT,
                          Icon:
                              buttonType === BUTTON_VARIANT.STANDARD
                                  ? AddCircleIcon
                                  : null,
                          type: buttonType,
                      }
            }
        >
                    <Grid container key={formKey}>
                        <Grid item lg={12} md={12} xs={12} id="add-place-form-container">
                            <Grid container>
                                <Grid item lg={12} xs={12} className="py-5">
                                    <PlaceAutocomplete
                                        value={place.name ?? ''}
                                        onTextChange={(text) =>
                                            handleOnChange('name', text)
                                        }
                                        onSelect={handlePlacePicked}
                                        country={countryScope}
                                        label={
                                            countryScope
                                                ? `Activity name (or place in ${countryScope})`
                                                : 'Activity name'
                                        }
                                        placeholder="Type a place to get AI suggestions, or any activity (e.g. 'Check out of hotel')"
                                    />
                                </Grid>
                                <Grid item lg={12} xs={12} className="py-5">
                                    <InputField
                                        value={place.location ?? ''}
                                        name="location"
                                        label="Location (optional)"
                                        required={false}
                                        onChange={(e) =>
                                            handleOnChange('location', e.target.value)
                                        }
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
                                        value={place.startTime ?? ''}
                                        name="startTime"
                                        type="time"
                                        label="Start Time"
                                        onChange={(e) => handleOnChange('startTime', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                    <InputField
                                        value={place.endTime ?? ''}
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
    );

    // Icon-only trigger: render bare so the trigger sits inline next to
    // surrounding flex items (e.g. activity title + status pill). The Grid
    // wrappers used by the standard/text variants force a full-width row
    // and push the trigger below the title.
    if (triggerIcon) {
        return modalElement;
    }

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
                {modalElement}
            </Grid>
        </Grid>
    );
};

export default AddPlaceBtn;

import { useState, useEffect, useMemo, useRef } from 'react';
import './index.scss';
import { formatDate, isValidDate, now } from 'utils';
import AddLocationAltRoundedIcon from '@mui/icons-material/AddLocationAltRounded';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import InputField from 'components/common/FormFields/InputField';
import AirportAutocomplete from 'components/common/FormFields/AirportAutocomplete';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import FlightSegmentLookupWatcher from 'components/common/AddPlaceBtn/FlightSegmentLookupWatcher';
import type { FlightLookupResult } from 'api/flightLookupApi';
import SearchBar from 'components/SearchBar';
import PlaceAutocomplete, {
    type PlaceSuggestion,
} from 'components/common/PlaceAutocomplete';
import { useNearestAirport } from 'api/hooks/useHomeDeparture';
import classNames from 'classnames';
import { ACTION, BUTTON_VARIANT } from 'constants';
import type {
    Activity,
    AddEditButtonProps,
    Country,
    Destination,
    FlightInfo,
} from 'types';

const DESTINATION_LABEL = {
    ADD: 'Add Destination',
    EDIT: 'Edit',
    SAVE: 'Save Destination',
} as const;

interface DestinationDraft {
    id?: number;
    country?: Country | null;
    flightInfo?: FlightInfo;
    itinerary?: Destination['itinerary'];
}

export interface AddDestinationBtnProps extends AddEditButtonProps<DestinationDraft, Destination> {
    defaultDate?: string;
    tripMaxDate?: string | null;
}

const AddDestinationBtn = ({
    defaultDate,
    tripMaxDate,
    onChange,
    type = ACTION.ADD,
    data = null,
    buttonType = BUTTON_VARIANT.STANDARD,
    isViewMode = false,
}: AddDestinationBtnProps) => {
    const isAdd = type === ACTION.ADD;
    const title = useMemo(() => (isAdd ? DESTINATION_LABEL.ADD : DESTINATION_LABEL.EDIT), [isAdd]);

    const [destination, setDestination] = useState<DestinationDraft>({});
    /** Optional "first place" seeded from PlaceAutocomplete. Held separately
     *  from the destination draft because the activity needs a date + id
     *  that we materialize at submit time. */
    const [firstPlaceText, setFirstPlaceText] = useState('');
    const [firstPlace, setFirstPlace] = useState<PlaceSuggestion | null>(null);
    // Flight is optional and collapsed by default so the common flow is
    // just "pick a country → Add Destination". Opens automatically in edit
    // mode when the saved destination already carries a flight.
    const [flightOpen, setFlightOpen] = useState(false);
    const modelRef = useRef<ModalButtonHandle>(null);
    // Home-base lookup: when the user opens AddDestination to plan a
    // flight to a new country, the depart airport is almost always
    // their home airport. Hook returns null when no home city is set —
    // in that case the seeding effect is a no-op, no UI prompt.
    const { data: nearestAirport } = useNearestAirport();

    /** Per-segment field setter. The segments array is the source of
     *  truth; the parent `flightInfo`'s flat fields are kept in sync with
     *  segment 0 on submit so legacy callers reading only the headline
     *  still see the right values. */
    const handleSegmentField = (
        index: number,
        name: keyof FlightInfo,
        value: string,
    ) => {
        setDestination((prev) => {
            const segs = prev.flightInfo?.segments?.length
                ? [...prev.flightInfo.segments]
                : [{}];
            const current = segs[index] ?? {};
            const updated: FlightInfo = { ...current, [name]: value };
            // Auto-fill arrival date from depart when arrival is empty
            // or was still tracking the old depart — same heuristic as
            // the Activity flight form so the picker doesn't open on
            // today when the trip is months out.
            if (
                name === 'departDate' &&
                value &&
                (!current.arrivalDate || current.arrivalDate === current.departDate)
            ) {
                updated.arrivalDate = value;
            }
            segs[index] = updated;
            return { ...prev, flightInfo: { ...(prev.flightInfo ?? {}), segments: segs } };
        });
    };

    const handleAddSegment = () => {
        setDestination((prev) => {
            const segs = prev.flightInfo?.segments?.length
                ? [...prev.flightInfo.segments]
                : [{}];
            // Default the new leg's depart date to the previous leg's
            // arrival date if known — multi-segment flights almost
            // always continue same-day, this saves a manual fill.
            // Also pre-fill the flight number with the previous leg's
            // so users entering a return / through-flight can re-use
            // it; they can edit if the connecting leg is different.
            const last = segs[segs.length - 1];
            const seedDate = last?.arrivalDate ?? last?.departDate;
            segs.push({
                ...(seedDate
                    ? { departDate: seedDate, arrivalDate: seedDate }
                    : {}),
                flightNumber: last?.flightNumber,
            });
            return { ...prev, flightInfo: { ...(prev.flightInfo ?? {}), segments: segs } };
        });
    };

    const handleRemoveSegment = (index: number) => {
        setDestination((prev) => {
            const segs = prev.flightInfo?.segments ?? [];
            if (segs.length <= 1) return prev;
            return {
                ...prev,
                flightInfo: {
                    ...(prev.flightInfo ?? {}),
                    segments: segs.filter((_, i) => i !== index),
                },
            };
        });
    };

    /** Apply a /flights/lookup result to a destination segment. The
     *  watcher only re-fires when (flight number, depart date)
     *  changes — i.e. the user typed a new flight number — so
     *  overwrite every field the result covers. A second lookup
     *  feels like a real update instead of a stale half-update. */
    const applyFlightLookup = (
        segIdx: number,
        result: FlightLookupResult,
    ) => {
        setDestination((prev) => {
            const segs = prev.flightInfo?.segments?.length
                ? [...prev.flightInfo.segments]
                : [{}];
            const current = segs[segIdx] ?? {};
            segs[segIdx] = {
                ...current,
                departAirport: result.departAirport ?? current.departAirport,
                arrivalAirport: result.arrivalAirport ?? current.arrivalAirport,
                departDate: result.departDate ?? current.departDate,
                departTime: result.departTime ?? current.departTime,
                arrivalDate: result.arrivalDate ?? current.arrivalDate,
                arrivalTime: result.arrivalTime ?? current.arrivalTime,
            };
            return {
                ...prev,
                flightInfo: { ...(prev.flightInfo ?? {}), segments: segs },
            };
        });
    };

    // Normalize whatever date format comes in (MM/DD/YYYY from
    // DestinationDetail or YYYY-MM-DD from raw state) into ISO YYYY-MM-DD so
    // the MUI DatePicker doesn't reject it and flag the field in red.
    const isoDate = (raw?: string | null): string | undefined => {
        if (!raw) return undefined;
        return isValidDate(raw) ? formatDate(raw) : undefined;
    };

    useEffect(() => {
        const fallback = isoDate(defaultDate) ?? now();
        if (data && type === ACTION.EDIT) {
            // Seed segments from the saved data: prefer the explicit
            // `segments` array (new multi-leg format), fall back to a
            // one-element list synthesized from the flat fields (legacy
            // single-leg destinations).
            const savedSegments = data.flightInfo?.segments;
            const segments: FlightInfo[] = savedSegments?.length
                ? savedSegments.map((seg) => ({
                      flightNumber: seg.flightNumber,
                      departAirport: seg.departAirport,
                      departDate: isoDate(seg.departDate) ?? fallback,
                      departTime: seg.departTime,
                      arrivalAirport: seg.arrivalAirport,
                      arrivalDate: isoDate(seg.arrivalDate) ?? fallback,
                      arrivalTime: seg.arrivalTime,
                  }))
                : [
                      {
                          flightNumber: data.flightInfo?.flightNumber,
                          departAirport: data.flightInfo?.departAirport,
                          departDate: isoDate(data.flightInfo?.departDate) ?? fallback,
                          departTime: data.flightInfo?.departTime,
                          arrivalAirport: data.flightInfo?.arrivalAirport,
                          arrivalDate: isoDate(data.flightInfo?.arrivalDate) ?? fallback,
                          arrivalTime: data.flightInfo?.arrivalTime,
                      },
                  ];
            setDestination({
                country: data.country,
                id: data.id,
                flightInfo: {
                    ...segments[0],
                    cost: data.flightInfo?.cost,
                    paidBy: data.flightInfo?.paidBy,
                    segments,
                },
                itinerary: data.itinerary,
            });
            // Reveal the flight section on edit only when the saved trip
            // actually has a flight worth showing.
            setFlightOpen(
                Boolean(
                    data.flightInfo?.flightNumber ||
                        data.flightInfo?.arrivalAirport
                )
            );
        } else {
            const seedSegment: FlightInfo = {
                departDate: fallback,
                departTime: now('HH:mm'),
                arrivalDate: fallback,
                arrivalTime: now('HH:mm'),
            };
            setDestination({
                country: null,
                flightInfo: { ...seedSegment, segments: [seedSegment] },
            });
            setFlightOpen(false);
        }
    }, [data, defaultDate, type]);

    // Home → destination auto-seed. Once the nearest-airport hook
    // resolves (after the user's set their home city in Account), drop
    // the IATA code into segment 0's depart slot if it's still empty.
    // EDIT mode opts out — the saved destination already has whatever
    // depart airport the user chose. Subsequent legs (segIdx > 0) are
    // internal to the trip so we don't touch them either.
    useEffect(() => {
        if (type !== ACTION.ADD || !nearestAirport) return;
        setDestination((prev) => {
            const segs = prev.flightInfo?.segments ?? [];
            if (!segs.length) return prev;
            if (segs[0].departAirport) return prev;
            const next = [...segs];
            next[0] = { ...next[0], departAirport: nearestAirport.iataCode };
            return {
                ...prev,
                flightInfo: { ...(prev.flightInfo ?? {}), segments: next },
            };
        });
    }, [nearestAirport, type]);

    const normalizedTripMaxDate = isoDate(tripMaxDate ?? undefined);

    const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        modelRef.current?.closeModal();

        // Sync the flat headline fields with segment 0 so consumers that
        // read `flightInfo.departDate` etc. (display cards, save mapper)
        // see consistent values whether or not they understand segments.
        const segments = destination.flightInfo?.segments ?? [];
        const firstSeg = segments[0];
        const flightInfo: FlightInfo | undefined = firstSeg
            ? {
                  flightNumber: firstSeg.flightNumber,
                  departAirport: firstSeg.departAirport,
                  departDate: firstSeg.departDate,
                  departTime: firstSeg.departTime,
                  arrivalAirport: firstSeg.arrivalAirport,
                  arrivalDate: firstSeg.arrivalDate,
                  arrivalTime: firstSeg.arrivalTime,
                  cost: destination.flightInfo?.cost,
                  paidBy: destination.flightInfo?.paidBy,
                  segments,
              }
            : destination.flightInfo;

        // If the user picked a "first place" suggestion, seed the
        // destination's itinerary with one activity for the depart day.
        // The reducer will give it a real id when it lands in state; we use
        // a placeholder Date.now() so React keys stay stable in the meantime.
        const seedDate =
            firstSeg?.departDate ?? isoDate(defaultDate) ?? now();
        const itineraryWithSeed =
            firstPlace && seedDate
                ? [
                      {
                          id: Date.now(),
                          date: seedDate,
                          activities: [
                              {
                                  id: Date.now() + 1,
                                  name: firstPlace.name,
                                  location: firstPlace.location,
                                  image: firstPlace.imageUrl
                                      ? {
                                            url: firstPlace.imageUrl,
                                            name: firstPlace.name,
                                        }
                                      : undefined,
                              } as Activity,
                          ],
                      },
                  ]
                : destination.itinerary;

        onChange?.({ ...destination, flightInfo, itinerary: itineraryWithSeed });

        // Reset the seed fields so reopening the modal starts fresh.
        if (type === ACTION.ADD) {
            setFirstPlace(null);
            setFirstPlaceText('');
        }
    };

    const handleSelectedDestinationSearch = (country: Country) => {
        setDestination((prev) => ({ ...prev, country }));
    };

    const handleFirstPlacePicked = (suggestion: PlaceSuggestion) => {
        setFirstPlace(suggestion);
        setFirstPlaceText(suggestion.name);
    };

    const handleFirstPlaceText = (text: string) => {
        setFirstPlaceText(text);
        // If the user keeps typing past a picked suggestion, drop the
        // resolved selection — they're going manual. The text alone isn't
        // enough to seed an activity since we'd be missing location/image,
        // so we just don't seed in that case.
        if (firstPlace && text !== firstPlace.name) {
            setFirstPlace(null);
        }
    };

    if (isViewMode) return null;

    return (
        <div
            className={classNames({
                'add-place-container-standard': buttonType === BUTTON_VARIANT.STANDARD,
                'add-place-container-simple': buttonType === BUTTON_VARIANT.TEXT,
            })}
        >
            <ModalButton
                    title={isAdd ? DESTINATION_LABEL.ADD : `${DESTINATION_LABEL.EDIT} ${data?.country?.name ?? ''}`}
                    ref={modelRef}
                    buttonProps={{
                        title,
                        Icon:
                            buttonType === BUTTON_VARIANT.STANDARD
                                ? AddLocationAltRoundedIcon
                                : null,
                        type: buttonType,
                    }}
                >
                    <div className="add-destination-comp">
                            <section className="add-destination-group">
                                <header className="add-destination-group-head">
                                    <span className="add-destination-group-num">1</span>
                                    <h4 className="add-destination-group-title">
                                        Destination
                                    </h4>
                                </header>
                                <div className="add-destination-field">
                                    <label className="add-destination-label">Country</label>
                                    <SearchBar
                                        defaultValue={data?.country}
                                        type="simple"
                                        onSelected={handleSelectedDestinationSearch}
                                    />
                                </div>
                                {type === ACTION.ADD && (
                                    <div className="add-destination-field">
                                        <label className="add-destination-label">
                                            First place to visit{' '}
                                            <span className="add-destination-optional">
                                                (optional)
                                            </span>
                                        </label>
                                        <PlaceAutocomplete
                                            value={firstPlaceText}
                                            onTextChange={handleFirstPlaceText}
                                            onSelect={handleFirstPlacePicked}
                                            country={destination.country?.name}
                                            label={
                                                destination.country?.name
                                                    ? `First place in ${destination.country.name}`
                                                    : 'First place to visit'
                                            }
                                            placeholder={
                                                destination.country?.name
                                                    ? 'Type a landmark or activity in this country'
                                                    : 'Pick the country above first'
                                            }
                                            disabled={!destination.country?.name}
                                        />
                                    </div>
                                )}
                            </section>

                            <section className="add-destination-group">
                                <header className="add-destination-group-head">
                                    <span className="add-destination-group-num">2</span>
                                    <h4 className="add-destination-group-title">
                                        Flight
                                    </h4>
                                    <span className="add-destination-optional add-destination-group-optional">
                                        optional
                                    </span>
                                    <button
                                        type="button"
                                        className="add-destination-flight-toggle"
                                        onClick={() =>
                                            setFlightOpen((open) => !open)
                                        }
                                        aria-expanded={flightOpen}
                                    >
                                        {flightOpen ? 'Hide flight' : 'Add flight'}
                                    </button>
                                </header>
                                {flightOpen && (
                                  <>
                                {(destination.flightInfo?.segments ?? [{}]).map(
                                    (seg, segIdx, allSegs) => (
                                        <div
                                            key={segIdx}
                                            className="add-destination-segment"
                                        >
                                            <div className="add-destination-segment-head">
                                                <span className="add-destination-segment-label">
                                                    {allSegs.length === 1
                                                        ? 'Outbound flight'
                                                        : `Leg ${segIdx + 1}`}
                                                </span>
                                                {allSegs.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="add-destination-segment-remove"
                                                        onClick={() => handleRemoveSegment(segIdx)}
                                                        aria-label={`Remove leg ${segIdx + 1}`}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                            {/* Auto-populates this leg's airports + times
                                                from AeroDataBox when the user types a real
                                                flight number + depart date. */}
                                            <FlightSegmentLookupWatcher
                                                flightNumber={seg.flightNumber}
                                                departDate={seg.departDate}
                                                onResult={(result) =>
                                                    applyFlightLookup(segIdx, result)
                                                }
                                            />
                                            <div className="add-destination-field">
                                                <label className="add-destination-label">Flight number</label>
                                                <InputField
                                                    value={seg.flightNumber ?? ''}
                                                    label=""
                                                    name={`flightNumber-${segIdx}`}
                                                    onChange={(e) =>
                                                        handleSegmentField(
                                                            segIdx,
                                                            'flightNumber',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="add-destination-row">
                                                <div className="add-destination-field">
                                                    <label className="add-destination-label">Depart airport</label>
                                                    <AirportAutocomplete
                                                        value={seg.departAirport ?? ''}
                                                        onChange={(code) =>
                                                            handleSegmentField(
                                                                segIdx,
                                                                'departAirport',
                                                                code,
                                                            )
                                                        }
                                                        placeholder="IATA code, city, or airport"
                                                    />
                                                </div>
                                                <div className="add-destination-field">
                                                    <label className="add-destination-label">Arrive airport</label>
                                                    <AirportAutocomplete
                                                        value={seg.arrivalAirport ?? ''}
                                                        onChange={(code) =>
                                                            handleSegmentField(
                                                                segIdx,
                                                                'arrivalAirport',
                                                                code,
                                                            )
                                                        }
                                                        placeholder="IATA code, city, or airport"
                                                    />
                                                </div>
                                            </div>
                                            <div className="add-destination-row">
                                                <div className="add-destination-field">
                                                    <label className="add-destination-label">Depart date</label>
                                                    <InputField
                                                        value={seg.departDate ?? ''}
                                                        type="date"
                                                        maxDate={normalizedTripMaxDate}
                                                        name={`departDate-${segIdx}`}
                                                        onChange={(e) =>
                                                            handleSegmentField(
                                                                segIdx,
                                                                'departDate',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className="add-destination-field">
                                                    <label className="add-destination-label">Depart time</label>
                                                    <InputField
                                                        value={seg.departTime ?? ''}
                                                        name={`departTime-${segIdx}`}
                                                        type="time"
                                                        label=""
                                                        onChange={(e) =>
                                                            handleSegmentField(
                                                                segIdx,
                                                                'departTime',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="add-destination-row">
                                                <div className="add-destination-field">
                                                    <label className="add-destination-label">Arrive date</label>
                                                    <InputField
                                                        value={seg.arrivalDate ?? ''}
                                                        type="date"
                                                        minDate={isoDate(seg.departDate)}
                                                        maxDate={normalizedTripMaxDate}
                                                        name={`arrivalDate-${segIdx}`}
                                                        onChange={(e) =>
                                                            handleSegmentField(
                                                                segIdx,
                                                                'arrivalDate',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className="add-destination-field">
                                                    <label className="add-destination-label">Arrive time</label>
                                                    <InputField
                                                        value={seg.arrivalTime ?? ''}
                                                        name={`arrivalTime-${segIdx}`}
                                                        type="time"
                                                        label=""
                                                        onChange={(e) =>
                                                            handleSegmentField(
                                                                segIdx,
                                                                'arrivalTime',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ),
                                )}
                                <button
                                    type="button"
                                    className="add-destination-segment-add"
                                    onClick={handleAddSegment}
                                >
                                    + Add stopover
                                </button>
                                <div className="add-destination-field add-destination-flight-cost">
                                    <label className="add-destination-label">
                                        Cost{' '}
                                        <span className="add-destination-optional">
                                            (optional)
                                        </span>
                                    </label>
                                    <InputField
                                        value={
                                            destination.flightInfo?.cost != null
                                                ? String(destination.flightInfo.cost)
                                                : ''
                                        }
                                        type="number"
                                        name="flightCost"
                                        label=""
                                        required={false}
                                        onChange={(e) =>
                                            setDestination((prev) => ({
                                                ...prev,
                                                flightInfo: {
                                                    ...(prev.flightInfo ?? {}),
                                                    cost: e.target.value,
                                                },
                                            }))
                                        }
                                    />
                                </div>
                                  </>
                                )}
                            </section>

                        <div className="add-destination-actions">
                            <ButtonCustom
                                onClick={handleSubmit}
                                label={isAdd ? DESTINATION_LABEL.ADD : DESTINATION_LABEL.SAVE}
                                type={BUTTON_VARIANT.STANDARD}
                                capitalizeType="uppercase"
                            />
                        </div>
                    </div>
            </ModalButton>
        </div>
    );
};

export default AddDestinationBtn;

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import "./index.scss";
import {
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Grid,
  IconButton,
  Switch,
  TextField,
} from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ModalButton, { type ModalButtonHandle } from "components/ModalButton";
import ButtonCustom from "components/common/FormFields/ButtonCustom";
import InputField from "components/common/FormFields/InputField";
import { useUser } from "context/UserContext";
import type { BudgetItem, BudgetEntry, Friend } from "types";

/** Per-person paid entry. Surfaced via `MarkPaidValue.splitEntries`
 *  for callers that want the full breakdown; the modal builds these
 *  from the activity's `budget` array on open + user edits. */
export interface PaidSplitEntry {
  /** Backend user UUID (Friend.userId). Empty string for legacy/
   *  mock friends that don't have a UUID — those rows render but
   *  can't be persisted via the backend's `paidByUserId` column. */
  userId: string;
  name: string | null;
  /** Amount this participant is paying. Defaults to their existing
   *  budget allocation when one exists, else equal share of the
   *  activity's total cost. */
  amount: number;
  /** Per-person paid date (YYYY-MM-DD). Defaults to today. */
  paidAt: string;
  /** True when the organizer has confirmed this participant actually
   *  paid. Drives whether the entry counts toward the primary
   *  `paidBy` + the chip's headline display. */
  confirmed: boolean;
}

export interface MarkPaidValue {
  /** Selected payer in the `{ id, name }` shape that round-trips
   *  through `Activity.paidBy` / `FlightInfo.paidBy`. `id` is the
   *  backend user UUID (Friend.userId). For split payments this is
   *  the first confirmed entry's user; `name` is a formatted
   *  multi-payer label like "Alice & Bob" or "Alice + 2 others". */
  paidBy: { id: string; name: string | null };
  /** ISO `YYYY-MM-DD` date. For split payments this is the latest
   *  confirmed entry's date — gives the chip a stable single-date
   *  surface while the per-person dates live in `splitEntries`. */
  paidAt: string;
  /** When set, the activity's `budget` array should be replaced with
   *  these entries so the per-person breakdown persists across the
   *  next modal open. The backend only stores a single
   *  `paidByUserId` + `paidAt` today; the `budget` array is the
   *  durable "who paid what amount" channel. */
  budgetUpdate?: BudgetEntry[];
  /** Full per-person breakdown including confirmation flags. Not
   *  persisted to the backend yet — callers that care can read this
   *  to drive in-session UI, but the next modal open re-derives
   *  from the budget + paidBy/paidAt. */
  splitEntries?: PaidSplitEntry[];
}

export interface MarkPaidModalHandle {
  open: () => void;
  close: () => void;
}

export interface MarkPaidModalProps {
  /** Trip participants the payer can be chosen from. Includes the
   *  organizer + every friend on the trip. Only entries with a real
   *  backend `userId` are selectable — legacy mock friends without
   *  a UUID can't be persisted. */
  participants: Friend[];
  /** Pre-filled values when editing an already-paid activity.
   *  `paidAt` is YYYY-MM-DD; `paidBy.id` is the user UUID. */
  initialPaidAt?: string | null;
  initialPaidBy?: { id: string; name: string | null } | null;
  /** Activity total cost — drives the equal-split default when the
   *  user toggles split mode on with no pre-existing budget. */
  cost?: string | number;
  /** Existing per-person budget breakdown. Pre-loads the split
   *  editor on open so "who's paying what" maps directly to "who
   *  paid what" in this view. */
  budget?: BudgetItem[];
  /** Save handler. Called with the picked payer + date (and the
   *  optional split breakdown + budget update for multi-payer
   *  flows). */
  onSubmit: (value: MarkPaidValue) => void;
  /** Clear handler — wipes both `paidAt` and `paidBy`. Only rendered
   *  when there's an existing paid attestation to clear (i.e.
   *  `initialPaidAt` is set). */
  onClear?: () => void;
}

interface PayerOption {
  /** Backend user UUID — same value used for `paidBy.id`. */
  id: string;
  label: string;
}

const todayIso = (): string => moment().format("YYYY-MM-DD");

const labelOf = (f: Friend): string => f.label ?? f.name ?? `Friend #${f.id}`;

/** Participant → PayerOption with a UUID. Mock friends without a
 *  backend `userId` are filtered out — they can't be persisted, so
 *  surfacing them in the picker would only let the user pick a value
 *  that would silently drop on save. */
const buildPayerOptions = (participants: Friend[]): PayerOption[] => {
  const out: PayerOption[] = [];
  for (const p of participants) {
    if (!p.userId) continue;
    out.push({ id: p.userId, label: labelOf(p) });
  }
  return out;
};

const MarkPaidModal = forwardRef<MarkPaidModalHandle, MarkPaidModalProps>(
  (
    {
      participants,
      initialPaidAt,
      initialPaidBy,
      cost,
      budget,
      onSubmit,
      onClear,
    },
    ref,
  ) => {
    const modalRef = useRef<ModalButtonHandle>(null);
    const { t } = useTranslation();
    const { user } = useUser();

    const payerOptions = useMemo(
      () => buildPayerOptions(participants),
      [participants],
    );

    // Default payer = current user when unpaid. Matches the spec:
    // "Save" should be a one-tap action for the common case of
    // "the organizer just paid for this".
    const defaultPayerId = initialPaidBy?.id ?? user?.id ?? null;

    // Build the initial split entries from the activity's existing
    // budget breakdown. When the user has already said "Alice owes
    // $50, Bob owes $25", the modal should open with those rows
    // pre-filled and the organizer just checks each one off.
    //
    // Pre-confirmation strategy — backend only stores a single
    // `paidByUserId` + `paidAt`, and resolves `paidBy.name` from the
    // User entity on refetch. That means a formatted multi-payer
    // string ("Alice & Bob") written on save gets overwritten back to
    // the resolved User.name ("Alice") next time the trip loads — so
    // `paidBy.name` is NOT a reliable channel for "who else paid".
    //
    // The `budget` array IS persisted as a first-class field, so it's
    // the durable signal: when the activity is marked paid AND has a
    // per-person budget, every budget entry counts as confirmed. This
    // mirrors the PDF / Excel exports (see `confirmedPaidEntries`) and
    // matches the user's mental model — "I split this and marked it
    // paid, so everyone in the split paid their share."
    //
    // Trade-off: there's no way to record "Alice paid, Bob still owes"
    // until backend gains a per-person confirmation column. The user
    // can drop someone from the split entirely (× the row) to express
    // "they don't owe me", but partial confirmation isn't persisted.
    const initialSplit = useMemo<PaidSplitEntry[]>(() => {
      if (!budget || budget.length === 0) return [];
      return budget
        .map((b): PaidSplitEntry | null => {
          const uid = b.user?.userId;
          if (!uid) return null;
          const amt =
            typeof b.budget === "number"
              ? b.budget
              : parseFloat(String(b.budget)) || 0;
          return {
            userId: uid,
            name: b.user?.label ?? b.user?.name ?? null,
            amount: amt,
            paidAt: initialPaidAt ?? todayIso(),
            // Confirmed = activity is paid. Unpaid rows start
            // unchecked so the organizer has to opt each one in
            // (which, on save, marks the activity paid).
            confirmed: !!initialPaidAt,
          };
        })
        .filter((e): e is PaidSplitEntry => e !== null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [budget, initialPaidAt]);

    const [paidAt, setPaidAt] = useState<string>(initialPaidAt ?? todayIso());
    const [payerId, setPayerId] = useState<string | null>(defaultPayerId);
    // Split mode: when ON, the single payer picker is replaced
    // by a per-person list (one row per budget entry) with a
    // checkbox + amount + date input on each. The primary
    // `paidBy.id` / `paidAt` written to the backend = first
    // confirmed row + latest of the confirmed dates. The
    // per-person breakdown lives on the `budget` array (via the
    // emitted `budgetUpdate`).
    const [isSplit, setIsSplit] = useState(() => initialSplit.length > 1);
    const [splitEntries, setSplitEntries] =
      useState<PaidSplitEntry[]>(initialSplit);

    // Re-sync when the modal is opened against a different activity
    // (e.g. organizer switches from one card to another without
    // unmounting the parent). Keying on the initial values means a
    // re-open with the same activity preserves any in-flight edit.
    const initSignature = `${initialPaidAt ?? ""}|${
      initialPaidBy?.id ?? ""
    }|${user?.id ?? ""}|${budget?.length ?? 0}|${(budget ?? [])
      .map((b) => `${b.id}:${b.user?.userId ?? ""}:${b.budget}`)
      .join(",")}`;
    useEffect(() => {
      setPaidAt(initialPaidAt ?? todayIso());
      setPayerId(defaultPayerId);
      setSplitEntries(initialSplit);
      setIsSplit(initialSplit.length > 1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initSignature]);

    // Solo trip safety net — when there's exactly one possible
    // payer and no explicit selection, pin them automatically so
    // the static "Paid by" label below has a name to render and
    // the Save button isn't blocked on a phantom picker. Skipped
    // when the user is already on a split or already picked
    // someone manually.
    useEffect(() => {
      if (!payerId && payerOptions.length === 1) {
        setPayerId(payerOptions[0].id);
      }
    }, [payerId, payerOptions]);

    useImperativeHandle(
      ref,
      () => ({
        open: () => modalRef.current?.openModel(),
        close: () => modalRef.current?.closeModal(),
      }),
      [],
    );

    const selectedOption: PayerOption | null = useMemo(() => {
      if (!payerId) return null;
      return (
        payerOptions.find((o) => o.id === payerId) ?? {
          id: payerId,
          // Fall back to whatever name we already have on the
          // existing paidBy so the picker shows the name on
          // first open even if the user is no longer a current
          // trip participant (left the trip after paying).
          label: initialPaidBy?.name ?? "Friend",
        }
      );
    }, [payerId, payerOptions, initialPaidBy?.name]);

    // Equal-share default for new split rows. Uses the activity's
    // cost (when known) divided across the current row count + 1.
    const equalShare = (rowCountAfterAdd: number): number => {
      const c =
        typeof cost === "number" ? cost : parseFloat(String(cost ?? "")) || 0;
      if (!c || rowCountAfterAdd <= 0) return 0;
      return Math.round((c / rowCountAfterAdd) * 100) / 100;
    };

    const updateEntry = (idx: number, patch: Partial<PaidSplitEntry>) => {
      setSplitEntries((prev) =>
        prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)),
      );
    };

    const removeEntry = (idx: number) => {
      setSplitEntries((prev) => prev.filter((_, i) => i !== idx));
    };

    const addEntry = (option: PayerOption) => {
      setSplitEntries((prev) => {
        // No duplicates — same user can't be on two rows.
        if (prev.some((e) => e.userId === option.id)) return prev;
        const nextCount = prev.length + 1;
        const share = equalShare(nextCount);
        // When adding to a non-empty list, also redistribute
        // (so 3 people on a $90 trip end up with $30 each).
        // Pure additive otherwise would keep $90 for #1 + $0
        // for #2 + #3, which doesn't match the user's mental
        // model of "I just added a splitter".
        const redistributed = prev.map((e) => ({
          ...e,
          amount: share,
        }));
        return [
          ...redistributed,
          {
            userId: option.id,
            name: option.label,
            amount: share,
            paidAt: todayIso(),
            confirmed: false,
          },
        ];
      });
    };

    const handleSave = () => {
      if (isSplit && splitEntries.length > 0) {
        const confirmed = splitEntries.filter((e) => e.confirmed);
        if (confirmed.length === 0) {
          // Nothing confirmed — emit a budget-only update so
          // the per-person amounts persist, but leave the
          // activity unpaid. Caller treats this as
          // "snapshotting the split without marking paid".
          const budgetUpdate: BudgetEntry[] = splitEntries.map((e) => ({
            user: {
              id: 0,
              userId: e.userId,
              name: e.name ?? undefined,
              label: e.name ?? undefined,
            } as Friend,
            budget: e.amount,
          }));
          // Fall through to no-paid: pass an empty paidBy id
          // is invalid, so we only proceed when there's an
          // existing payment to preserve OR when the user
          // explicitly asked to update amounts only.
          if (!initialPaidBy?.id) return;
          onSubmit({
            paidBy: initialPaidBy,
            paidAt: initialPaidAt ?? paidAt,
            budgetUpdate,
            splitEntries,
          });
          modalRef.current?.closeModal();
          return;
        }
        // Compose the primary `paidBy` + the formatted multi-
        // payer label. Backend stores the primary; the chip /
        // exports surface the formatted name.
        const primary = confirmed[0];
        const names = confirmed.map((e) => e.name ?? "Friend");
        const formatted =
          names.length === 1
            ? names[0]
            : names.length === 2
              ? `${names[0]} & ${names[1]}`
              : `${names[0]} + ${names.length - 1} others`;
        // Latest of the confirmed dates anchors the activity
        // record (the per-person dates persist via the budget
        // breakdown later when backend supports it).
        const latestDate = confirmed.reduce(
          (max, e) => (e.paidAt > max ? e.paidAt : max),
          confirmed[0].paidAt,
        );
        const budgetUpdate: BudgetEntry[] = splitEntries.map((e) => ({
          user: {
            id: 0,
            userId: e.userId,
            name: e.name ?? undefined,
            label: e.name ?? undefined,
          } as Friend,
          budget: e.amount,
        }));
        onSubmit({
          paidBy: { id: primary.userId, name: formatted },
          paidAt: latestDate,
          budgetUpdate,
          splitEntries,
        });
        modalRef.current?.closeModal();
        return;
      }
      // Single-payer mode (existing behavior).
      if (!payerId || !paidAt) return;
      const name =
        payerOptions.find((o) => o.id === payerId)?.label ??
        initialPaidBy?.name ??
        null;
      onSubmit({ paidBy: { id: payerId, name }, paidAt });
      modalRef.current?.closeModal();
    };

    const handleClear = () => {
      onClear?.();
      modalRef.current?.closeModal();
    };

    const canSave = isSplit
      ? splitEntries.some((e) => e.confirmed) || Boolean(initialPaidBy?.id)
      : Boolean(payerId && paidAt);
    const showClear = Boolean(initialPaidAt && onClear);

    const isEdit = Boolean(initialPaidAt);
    // Participant options not yet on the split list — drives the
    // "Add participant" autocomplete at the bottom of the split
    // editor.
    const availableAddOptions = payerOptions.filter(
      (o) => !splitEntries.some((e) => e.userId === o.id),
    );
    return (
      <ModalButton
        ref={modalRef}
        title={isEdit ? t("activity.markPaid.editTitle") : t("activity.markPaid.title")}
        buttonProps={null}
        containerClassName="mark-paid-modal-shell"
      >
        <Grid container className="mark-paid-modal">
          {/* Subhead — gives the dialog a sense of purpose
                        without burying it in fine print. Different copy
                        for new vs edit so the user knows which mode
                        they're in at a glance. */}
          <Grid item lg={12} xs={12} className="mark-paid-subhead">
            <CheckCircleOutlineRoundedIcon
              className="mark-paid-subhead-icon"
              fontSize="small"
            />
            <span>
              {isEdit
                ? t("activity.markPaid.subheadEdit")
                : t("activity.markPaid.subhead")}
            </span>
          </Grid>
          {/* Add participant — sits at the TOP of the split
                        block so it's the first interaction in this
                        mode. Picking a participant adds a row to the
                        list below; the toggle, hint, and list all
                        live below this picker. */}
          {isSplit && availableAddOptions.length > 0 && (
            <Grid item lg={12} xs={12} className="field-row">
              <Autocomplete<PayerOption, false, false, false>
                options={availableAddOptions}
                value={null}
                onChange={(_e, val) => {
                  if (val) addEntry(val);
                }}
                blurOnSelect
                isOptionEqualToValue={(o, v) => o.id === v.id}
                getOptionLabel={(o) => o.label}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("activity.markPaid.addParticipant")}
                    placeholder={t("activity.markPaid.pickParticipant")}
                  />
                )}
                className="mark-paid-split-add"
              />
            </Grid>
          )}
          {/* Split toggle. Switches the modal between two
                        modes: a single Autocomplete (one payer) and a
                        per-row list (multiple payers, each with their
                        own amount + date + paid checkbox). Sits
                        directly below the Add-participant picker in
                        split mode, and above the per-person hint +
                        rows. The toggle is sticky once the activity
                        has a multi-entry budget — those rows would be
                        lost if we silently collapsed back to single
                        mode. */}
          {/* Split toggle only makes sense when there's more than
              one person to split with. Solo trips collapse this
              entire row + the Paid-by dropdown below into a static
              "Paid by you / them" line. */}
          {payerOptions.length > 1 && (
            <Grid
              item
              lg={12}
              xs={12}
              className="field-row mark-paid-split-toggle"
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={isSplit}
                    onChange={(_e, val) => {
                      setIsSplit(val);
                      // When flipping to split with
                      // no rows yet, seed the list
                      // with the current single
                      // payer so the user sees a
                      // starting point instead of
                      // an empty editor.
                      if (val && splitEntries.length === 0 && payerId) {
                        const opt = payerOptions.find(
                          (o) => o.id === payerId,
                        );
                        if (opt) {
                          setSplitEntries([
                            {
                              userId: opt.id,
                              name: opt.label,
                              amount: equalShare(1),
                              paidAt,
                              confirmed: true,
                            },
                          ]);
                        }
                      }
                    }}
                  />
                }
                label={t("activity.markPaid.splitToggle")}
              />
            </Grid>
          )}
          {!isSplit && (
            <>
              {payerOptions.length > 1 ? (
                <Grid item lg={12} md={12} xs={12} className="field-row">
                  <Autocomplete<PayerOption, false, false, false>
                    options={payerOptions}
                    value={selectedOption}
                    onChange={(_e, val) => setPayerId(val ? val.id : null)}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    getOptionLabel={(o) => o.label}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("activity.markPaid.paidBy")}
                        placeholder={t("activity.markPaid.pickParticipant")}
                      />
                    )}
                  />
                </Grid>
              ) : (
                /* Single-person trip — auto-pick that person and
                 * render a static label instead of a dropdown with
                 * one option (which would just be a redundant
                 * picker). The payerId effect above already pinned
                 * them via the single-option fallback. */
                <Grid item lg={12} md={12} xs={12} className="field-row">
                  <div className="mark-paid-solo-payer">
                    <span className="mark-paid-solo-payer-label">
                      {t("activity.markPaid.paidBy")}
                    </span>
                    <span className="mark-paid-solo-payer-name">
                      {payerOptions[0]?.label ?? t("activity.markPaid.you")}
                    </span>
                  </div>
                </Grid>
              )}
              <Grid item lg={12} md={12} xs={12} className="field-row">
                <InputField
                  type="date"
                  label={t("activity.markPaid.paidOn")}
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </Grid>
            </>
          )}
          {/* Hint sits between the toggle and the per-person
                        rows in split mode — instructional copy
                        immediately above the list it describes.
                        Hidden in single mode (the single Autocomplete
                        doesn't need the per-person tick instruction). */}
          {isSplit && (
            <Grid item lg={12} xs={12} className="field-row">
              <p className="mark-paid-split-hint mark-paid-split-hint-top">
                {t("activity.markPaid.splitHint")}
              </p>
            </Grid>
          )}
          {isSplit && (
            <Grid
              item
              lg={12}
              md={12}
              xs={12}
              className="field-row mark-paid-split-list"
            >
              {splitEntries.length === 0 && (
                <p className="mark-paid-split-empty">
                  {t("activity.markPaid.splitEmpty")}
                </p>
              )}
              {splitEntries.map((entry, idx) => (
                <div
                  key={entry.userId || `row-${idx}`}
                  className="mark-paid-split-row"
                >
                  <Checkbox
                    checked={entry.confirmed}
                    onChange={(_e, checked) =>
                      updateEntry(idx, { confirmed: checked })
                    }
                    aria-label={t("activity.markPaid.confirmPaidAria", {
                      name: entry.name ?? t("activity.markPaid.participantFallback"),
                    })}
                  />
                  <span className="mark-paid-split-name">
                    {entry.name ?? t("activity.markPaid.friendFallback")}
                  </span>
                  <TextField
                    type="number"
                    size="small"
                    label={t("activity.markPaid.amount")}
                    value={entry.amount === 0 ? "" : String(entry.amount)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      updateEntry(idx, {
                        amount: Number.isFinite(v) ? v : 0,
                      });
                    }}
                    inputProps={{ step: 0.01, min: 0 }}
                    className="mark-paid-split-amount"
                  />
                  <TextField
                    type="date"
                    size="small"
                    label={t("activity.markPaid.date")}
                    value={entry.paidAt}
                    onChange={(e) =>
                      updateEntry(idx, { paidAt: e.target.value })
                    }
                    InputLabelProps={{ shrink: true }}
                    className="mark-paid-split-date"
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeEntry(idx)}
                    aria-label={t("activity.markPaid.removeAria", {
                      name: entry.name ?? t("activity.markPaid.participantFallback"),
                    })}
                    className="mark-paid-split-remove"
                  >
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </div>
              ))}
            </Grid>
          )}
          <Grid item lg={12} md={12} xs={12} className="mark-paid-actions">
            <ButtonCustom
              onClick={() => modalRef.current?.closeModal()}
              label={t("common.cancel")}
              type="line"
              capitalizeType="capitalize"
            />
            {showClear && (
              <ButtonCustom
                onClick={handleClear}
                label={t("activity.markPaid.markUnpaid")}
                type="line"
                capitalizeType="capitalize"
                className="mark-paid-unpaid-btn"
              />
            )}
            <ButtonCustom
              onClick={handleSave}
              label={isEdit ? t("activity.markPaid.saveChanges") : t("activity.markPaid.title")}
              type="standard-small"
              capitalizeType="capitalize"
              disabled={!canSave}
            />
          </Grid>
        </Grid>
      </ModalButton>
    );
  },
);

MarkPaidModal.displayName = "MarkPaidModal";

export default MarkPaidModal;

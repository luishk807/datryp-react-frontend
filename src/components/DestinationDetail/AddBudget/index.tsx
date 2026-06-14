import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './index.scss';
import ModalButton, {
    type ModalButtonButtonProps,
    type ModalButtonHandle,
} from 'components/ModalButton';
import { Autocomplete, Grid, TextField } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import Toggle from 'components/common/FormFields/Toggle';
import type { BudgetEntry, BudgetItem, Friend } from 'types';

interface AddBudgetProps {
    participants?: Friend[];
    budget?: BudgetItem[];
    /** Total cost of the activity. When one person pays for the whole
     *  thing, this is the amount we record against them. */
    cost?: string | number | null;
    onSubmit: (entries: BudgetEntry[]) => void;
    isViewMode?: boolean;
}

interface PayerOption {
    id: number;
    label: string;
    friend: Friend;
}

const toNumber = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    const n = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(n) ? n : 0;
};

const labelOf = (f: Friend): string =>
    f.label ?? f.name ?? `Friend #${f.id}`;

export const AddBudget = ({
    participants = [],
    onSubmit,
    budget = [],
    cost = 0,
    isViewMode = false,
}: AddBudgetProps) => {
    const { t } = useTranslation();
    const modalRef = useRef<ModalButtonHandle>(null);

    // Existing budget with exactly one entry → start in sole-payer mode
    // preselected to that person. Anything else (zero or multiple entries)
    // opens in split mode. The user can flip the toggle either way.
    const initialIsSplit = budget.length > 1;
    const initialSolePayer: Friend | null =
        budget.length === 1 ? budget[0].user : null;

    const [isSplit, setIsSplit] = useState<boolean>(initialIsSplit);
    const [solePayer, setSolePayer] = useState<Friend | null>(initialSolePayer);

    // Solo trip: auto-pick the single participant so the static
    // "Paid by" row below renders with their name and the Save
    // button has a payer to attribute the budget to. Skips when
    // the user has already chosen someone or the split toggle is
    // active.
    useEffect(() => {
        if (!isSplit && !solePayer && participants.length === 1) {
            setSolePayer(participants[0]);
        }
    }, [isSplit, solePayer, participants]);
    const [splitBudget, setSplitBudget] = useState<BudgetEntry[]>(() =>
        budget.map(({ user, budget: b }) => ({ user, budget: b }))
    );

    // Re-sync when the budget prop changes underneath us (e.g. modal
    // re-opens after another save). `budget` is an array reference so we
    // key on its length + first id to avoid pointless resets on every
    // render of the parent.
    const budgetSignature = useMemo(
        () =>
            budget
                .map((b) => `${b.user.id}:${b.budget}`)
                .join('|'),
        [budget]
    );
    useEffect(() => {
        setIsSplit(budget.length > 1);
        setSolePayer(budget.length === 1 ? budget[0].user : null);
        setSplitBudget(
            budget.map(({ user, budget: b }) => ({ user, budget: b }))
        );
        // budgetSignature is the meaningful change signal; eslint can't see that
        // it summarises `budget` so we silence the rule explicitly.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [budgetSignature]);

    const payerOptions: PayerOption[] = useMemo(
        () =>
            participants.map((p) => ({
                id: p.id,
                label: labelOf(p),
                friend: p,
            })),
        [participants]
    );

    const soleOption: PayerOption | null = useMemo(() => {
        if (isSplit || !solePayer) return null;
        return (
            payerOptions.find((o) => o.id === solePayer.id) ?? {
                id: solePayer.id,
                label: labelOf(solePayer),
                friend: solePayer,
            }
        );
    }, [isSplit, solePayer, payerOptions]);

    const handleSplitInputChange = (
        user: Friend,
        e: { target: { value: string } }
    ) => {
        const { value } = e.target;
        setSplitBudget((prev) => {
            const without = prev.filter((b) => b.user.id !== user.id);
            const numeric = toNumber(value);
            if (numeric <= 0) return without;
            return [...without, { user, budget: value }];
        });
    };

    const handleToggleSplit = (next: boolean) => {
        setIsSplit(next);
        if (next) {
            // Entering split mode clears the single-payer selection so the
            // search bar empties out and disables.
            setSolePayer(null);
        }
    };

    const handleSubmit = () => {
        if (isSplit) {
            onSubmit(splitBudget);
        } else if (solePayer) {
            // Single payer covers the full activity cost.
            const amount = toNumber(cost);
            onSubmit([{ user: solePayer, budget: String(amount) }]);
        } else {
            // No payer + not split → clear out any prior budget.
            onSubmit([]);
        }
        modalRef.current?.closeModal();
    };

    /** On modal dismissal (X / backdrop / escape / programmatic close),
     *  if the user toggled into split mode but didn't type any amounts,
     *  treat the visit as exploratory and revert local state back to what
     *  the saved budget says. Prevents an empty split row from "stuck"
     *  reopening the next time the user clicks the icon. */
    const handleModalClose = () => {
        const hasTypedSplit = splitBudget.some(
            (b) => toNumber(b.budget) > 0
        );
        if (isSplit && !hasTypedSplit) {
            setIsSplit(budget.length > 1);
            setSolePayer(budget.length === 1 ? budget[0].user : null);
            setSplitBudget(
                budget.map(({ user, budget: b }) => ({ user, budget: b }))
            );
        }
    };

    const total = isSplit
        ? splitBudget.reduce((sum, b) => sum + toNumber(b.budget), 0)
        : solePayer
        ? toNumber(cost)
        : 0;

    if (isViewMode) return null;

    const hasBudget = budget.length > 0;
    const triggerProps: ModalButtonButtonProps = hasBudget
        ? {
              Icon: EditOutlinedIcon,
              type: 'text-plain',
              className: 'budget-edit-trigger',
              ariaLabel: t('activity.budget.editAria'),
              iconProps: { fontSize: 'small' },
          }
        : {
              title: t('activity.budget.whoIsPaying'),
              type: 'text',
              className: 'budget-add-trigger',
              ariaLabel: t('activity.budget.setPayerAria'),
          };

    return (
        <ModalButton
            ref={modalRef}
            title={t('activity.budget.title')}
            buttonProps={triggerProps}
            containerClassName="travel-budget-modal-shell"
            onClose={handleModalClose}
        >
            <Grid container className="travel-budget">
                <Grid item lg={12} xs={12} md={12} className="description">
                    {t('activity.budget.whoIsPayingForThis')}
                </Grid>
                {/* Picker only renders when there's more than one
                    option. Solo trip → auto-pick the single
                    participant and replace the dropdown with a
                    static "Paid by <name>" line; nothing for the
                    user to choose so a picker is just noise. */}
                {payerOptions.length > 1 ? (
                    <Grid item lg={12} xs={12} md={12} className="payer-search">
                        <Autocomplete<PayerOption, false, false, false>
                            disabled={isSplit}
                            options={payerOptions}
                            value={soleOption}
                            onChange={(_e, val) =>
                                setSolePayer(val ? val.friend : null)
                            }
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            getOptionLabel={(o) => o.label}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={t('activity.budget.selectPayer')}
                                    placeholder={t('activity.budget.searchFriend')}
                                />
                            )}
                        />
                    </Grid>
                ) : (
                    <Grid item lg={12} xs={12} md={12} className="payer-search">
                        <div className="travel-budget-solo-payer">
                            <span className="travel-budget-solo-payer-label">
                                {t('activity.budget.paidBy')}
                            </span>
                            <span className="travel-budget-solo-payer-name">
                                {payerOptions[0]?.label ??
                                    t('activity.budget.you')}
                            </span>
                        </div>
                    </Grid>
                )}
                {/* Split toggle only when there's actually somebody
                    to split with. Solo trip → no toggle. */}
                {payerOptions.length > 1 && (
                    <Grid item lg={12} xs={12} md={12} className="split-toggle">
                        <Toggle
                            label={t('activity.budget.splitPayment')}
                            checked={isSplit}
                            onChange={handleToggleSplit}
                        />
                    </Grid>
                )}
                {isSplit && (
                    <Grid item lg={12} xs={12} md={12} className="items">
                        {participants.map((participant) => {
                            const existing = splitBudget.find(
                                (b) => b.user.id === participant.id
                            );
                            return (
                                <Grid
                                    container
                                    key={participant.id}
                                    className="item"
                                >
                                    <Grid
                                        item
                                        lg={7}
                                        xs={7}
                                        md={7}
                                        className="label"
                                    >
                                        {labelOf(participant)}
                                    </Grid>
                                    <Grid
                                        item
                                        lg={5}
                                        xs={5}
                                        md={5}
                                        className="data"
                                    >
                                        <InputField
                                            name="budget"
                                            defaultValue={
                                                existing
                                                    ? String(existing.budget)
                                                    : ''
                                            }
                                            onChange={(e) =>
                                                handleSplitInputChange(
                                                    participant,
                                                    e
                                                )
                                            }
                                            type="number"
                                        />
                                    </Grid>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
                <Grid item lg={12} xs={12} md={12} className="total">
                    {t('activity.budget.total')}{' '}
                    {total.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                    })}
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="button-container">
                    <ButtonCustom
                        onClick={handleSubmit}
                        nativeType="button"
                        label={t('activity.budget.save')}
                        type="standard"
                        capitalizeType="uppercase"
                    />
                </Grid>
            </Grid>
        </ModalButton>
    );
};

export default AddBudget;

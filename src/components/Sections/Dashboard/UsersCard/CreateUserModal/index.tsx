import { useState } from 'react';
import './index.scss';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
} from '@mui/material';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import { useCreateAdminUser } from 'api/hooks/useAdmin';
import { BUTTON_VARIANT, USER_ROLE } from 'constants';
import type { UserRole } from 'types';

export interface CreateUserModalProps {
    open: boolean;
    onClose: () => void;
    /** Called with the newly-created user's email so the parent can surface
     *  a confirmation toast. */
    onCreated?: (email: string) => void;
}

interface FormState {
    email: string;
    password: string;
    name: string;
    birthYear: string;
    role: UserRole;
}

const INITIAL: FormState = {
    email: '',
    password: '',
    name: '',
    birthYear: '',
    role: USER_ROLE.USER,
};

const CreateUserModal = ({ open, onClose, onCreated }: CreateUserModalProps) => {
    const [form, setForm] = useState<FormState>(INITIAL);
    const [error, setError] = useState<string | null>(null);
    const createUser = useCreateAdminUser();

    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
        setForm((f) => ({ ...f, [k]: v }));
        if (error) setError(null);
    };

    const close = () => {
        setForm(INITIAL);
        setError(null);
        onClose();
    };

    const handleCreate = () => {
        const email = form.email.trim();
        const password = form.password;
        if (!email || !password) {
            setError('Email and password are required.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        const birthYearNum = form.birthYear.trim()
            ? Number(form.birthYear)
            : null;
        if (
            birthYearNum !== null &&
            (Number.isNaN(birthYearNum) || birthYearNum < 1900 || birthYearNum > new Date().getFullYear())
        ) {
            setError('Birth year must be a valid 4-digit year.');
            return;
        }

        createUser.mutate(
            {
                email,
                password,
                name: form.name.trim() || null,
                birthYear: birthYearNum,
                role: form.role,
            },
            {
                onSuccess: (created) => {
                    onCreated?.(created.email);
                    close();
                },
                onError: (err) => {
                    setError(
                        err instanceof Error ? err.message : 'Failed to create user.'
                    );
                },
            }
        );
    };

    return (
        <Dialog
            open={open}
            onClose={close}
            fullWidth
            maxWidth="sm"
            className="create-user-dialog"
            aria-labelledby="create-user-dialog-title"
        >
            <DialogTitle id="create-user-dialog-title">Create user</DialogTitle>
            <DialogContent className="create-user-dialog-content">
                <p className="create-user-dialog-help">
                    Admin-create skips the COPPA attestation. The new user
                    receives no welcome email.
                </p>
                <div className="create-user-field">
                    <InputField
                        name="email"
                        label="Email"
                        type="email"
                        defaultValue={form.email}
                        onChange={(e) => set('email', e.target.value)}
                    />
                </div>
                <div className="create-user-field">
                    <InputField
                        name="password"
                        label="Password (min 8 chars)"
                        type="password"
                        defaultValue={form.password}
                        onChange={(e) => set('password', e.target.value)}
                    />
                </div>
                <div className="create-user-field">
                    <InputField
                        name="name"
                        label="Name (optional)"
                        type="text"
                        defaultValue={form.name}
                        onChange={(e) => set('name', e.target.value)}
                    />
                </div>
                <div className="create-user-field">
                    <InputField
                        name="birth_year"
                        label="Birth year (optional)"
                        type="number"
                        defaultValue={form.birthYear}
                        onChange={(e) => set('birthYear', e.target.value)}
                    />
                </div>
                <div className="create-user-field">
                    <FormControl fullWidth size="small">
                        <InputLabel id="create-user-role-label">Role</InputLabel>
                        <Select
                            labelId="create-user-role-label"
                            value={form.role}
                            label="Role"
                            onChange={(e) =>
                                set('role', e.target.value as UserRole)
                            }
                        >
                            <MenuItem value={USER_ROLE.USER}>User</MenuItem>
                            <MenuItem value={USER_ROLE.ADMIN}>Admin</MenuItem>
                        </Select>
                    </FormControl>
                </div>

                {error && (
                    <p className="create-user-error" role="alert">
                        {error}
                    </p>
                )}
            </DialogContent>
            <DialogActions>
                <ButtonCustom
                    type={BUTTON_VARIANT.STANDARD_SMALL}
                    label="Cancel"
                    onClick={close}
                />
                <ButtonCustom
                    type={BUTTON_VARIANT.STANDARD_SMALL}
                    label={createUser.isPending ? 'Creating…' : 'Create user'}
                    onClick={handleCreate}
                    disabled={createUser.isPending}
                />
            </DialogActions>
        </Dialog>
    );
};

export default CreateUserModal;

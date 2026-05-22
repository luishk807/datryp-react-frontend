import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    removeProfileImage,
    uploadProfileImage,
} from 'api/profileImageApi';
import { queryKeys } from 'api/queryKeys';

/** Upload a new profile image and refresh `/auth/me` so the UserContext
 *  + every avatar (Header, Account, etc.) picks up the new URL. */
export const useUploadProfileImage = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (file: File) => uploadProfileImage(file),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.currentUser });
        },
    });
};

/** Clear the profile image and refresh `/auth/me` so the avatar falls
 *  back to the initial-letter placeholder. */
export const useRemoveProfileImage = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => removeProfileImage(),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.currentUser });
        },
    });
};

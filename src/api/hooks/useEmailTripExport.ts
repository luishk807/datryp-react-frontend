/**
 * Mutation that uploads a trip's PDF + Excel to the backend, which emails
 * them to every member. Used by the auto-export-on-confirm flow in TripDetail.
 */
import { useMutation } from '@tanstack/react-query';
import {
    emailTripExport,
    type TripExportEmailResult,
} from 'api/tripExportApi';

interface EmailTripExportVars {
    tripId: string;
    pdf: Blob;
    excel: Blob;
    tripName?: string;
}

export const useEmailTripExport = () =>
    useMutation<TripExportEmailResult, Error, EmailTripExportVars>({
        mutationFn: ({ tripId, pdf, excel, tripName }) =>
            emailTripExport(tripId, pdf, excel, tripName),
    });

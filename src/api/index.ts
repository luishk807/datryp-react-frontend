export { graphqlClient, setAuthToken } from './graphqlClient';
export { pythonGqlClient } from './pythonGqlClient';
export { queryClient } from './queryClient';
export { queryKeys } from './queryKeys';
export { useMe } from './hooks/useMe';
export { useCountryRecommendations } from './hooks/useCountryRecommendations';
export { useCountries } from './hooks/useCountries';
export type { CountryResult } from './hooks/useCountries';
export { useItineraryTypes, useTripStatuses } from './hooks/useLookups';
export type { LookupRow } from './hooks/useLookups';
export { useFriends } from './hooks/useFriends';
export type { ApiFriend } from './hooks/useFriends';
export {
    useMyItineraries,
    useSaveItinerary,
    useDeleteItinerary,
    isSingleDestination,
    isMultiDestination,
} from './hooks/useItineraries';
export type {
    ApiItinerary,
    ApiItineraryDate,
    ApiActivity,
    ApiCountry,
    ApiFlightInfo,
    ApiUserPublic,
    SaveItineraryInput,
    ItineraryDayInput,
    ActivityInput,
    FlightInfoInput,
} from './hooks/useItineraries';
export {
    useCurrentUser,
    useLogin,
    useSignup,
    useLogout,
} from './hooks/useAuth';
export { AuthError } from './authApi';
export type {
    SignupPayload,
    LoginPayload,
    TokenResponse,
    MeResponse,
} from './authApi';

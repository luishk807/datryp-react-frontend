import { z } from 'zod';

/**
 * Zod CONTRACTS for the friends-visited boundary:
 *   GET /me/friends-visited/{kind}/{key} → { count, friends[] }  (badge/drawer)
 *   GET /me/friends-visited/all          → { countries, cities, places }  (Atlas)
 *
 * The per-page item carries a friend's own star rating + review (place-keyed;
 * both null for city / country). The aggregate nests three grouped lists, each
 * with a `FriendBrief[]`. `.strict()` on every level.
 */
export const FriendBriefWireContract = z
    .object({
        user_id: z.string(),
        name: z.string(),
        profile_image_url: z.string().nullable(),
    })
    .strict();

export const FriendVisitedItemWireContract = z
    .object({
        user_id: z.string(),
        name: z.string(),
        profile_image_url: z.string().nullable(),
        visited_at: z.string(),
        rating: z.number().nullable(),
        review_text: z.string().nullable(),
    })
    .strict();

export const FriendsVisitedWireContract = z
    .object({
        count: z.number(),
        friends: z.array(FriendVisitedItemWireContract),
    })
    .strict();

export const FriendsVisitedCountryGroupWireContract = z
    .object({
        country_code: z.string(),
        country_name: z.string(),
        friends: z.array(FriendBriefWireContract),
    })
    .strict();

export const FriendsVisitedCityGroupWireContract = z
    .object({
        city_slug: z.string(),
        city_name: z.string(),
        country_name: z.string(),
        country_code: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        friends: z.array(FriendBriefWireContract),
    })
    .strict();

export const FriendsVisitedPlaceGroupWireContract = z
    .object({
        place_key: z.string(),
        place_name: z.string(),
        place_city: z.string(),
        place_country: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        friends: z.array(FriendBriefWireContract),
    })
    .strict();

export const FriendsVisitedAllWireContract = z
    .object({
        countries: z.array(FriendsVisitedCountryGroupWireContract),
        cities: z.array(FriendsVisitedCityGroupWireContract),
        places: z.array(FriendsVisitedPlaceGroupWireContract),
    })
    .strict();

/** Wire-shape fixtures for `GET /geo/language`. The raw response type isn't
 *  exported from the module (the client returns only the derived primitives),
 *  so we pin the shape locally here. */
export interface GeoLanguageWire {
    lang: 'en' | 'es' | null;
    country: string | null;
}

export const geoLanguageEsFixture: GeoLanguageWire = {
    lang: 'es',
    country: 'mx',
};

export const geoLanguageEnFixture: GeoLanguageWire = {
    lang: 'en',
    country: 'US',
};

export const geoLanguageNullFixture: GeoLanguageWire = {
    lang: null,
    country: null,
};

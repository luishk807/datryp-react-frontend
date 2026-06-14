/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GRAPHQL_URL?: string;
    readonly VITE_SOCIAL_INSTAGRAM?: string;
    readonly VITE_SOCIAL_FACEBOOK?: string;
    readonly VITE_SOCIAL_TWITTER?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

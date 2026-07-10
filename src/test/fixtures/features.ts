/** Wire-shape fixtures for the feature-flag endpoints. The module's raw
 *  interfaces are private, so the shapes are pinned locally. */
export interface FeatureFlagsWire {
    sms_enabled: boolean;
}
export interface SmsSettingWire {
    enabled: boolean;
    configured: boolean;
    effective: boolean;
}

export const featureFlagsWireFixture: FeatureFlagsWire = {
    sms_enabled: true,
};

export const smsSettingWireFixture: SmsSettingWire = {
    enabled: true,
    configured: true,
    effective: true,
};

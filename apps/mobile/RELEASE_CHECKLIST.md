# Adero Mobile — Release Checklist

## Pre-Build
- [ ] Replace placeholder assets (icon.png, splash.png, adaptive-icon.png, notification-icon.png)
- [ ] Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in EAS secrets
- [ ] Set EXPO_PUBLIC_API_BASE_URL to production URL in eas.json
- [ ] Update eas.json submit.production with real Apple/Google credentials
- [ ] Run `eas build --platform all --profile production`

## iOS App Store
- [ ] App name: Adero
- [ ] Bundle ID: com.adero.mobile
- [ ] Screenshots: 6.7" (1290x2796), 6.5" (1284x2778), 5.5" (1242x2208)
- [ ] App description, keywords, categories
- [ ] Privacy policy URL
- [ ] Location permission usage descriptions (already in app.json)
- [ ] Push notification entitlement
- [ ] Submit via `eas submit --platform ios --profile production`

## Google Play Store
- [ ] Package: com.adero.mobile
- [ ] Feature graphic: 1024x500
- [ ] Screenshots: phone and tablet
- [ ] Content rating questionnaire
- [ ] Privacy policy URL
- [ ] Submit via `eas submit --platform android --profile production`

## Post-Launch
- [ ] Monitor crash reports (Sentry or EAS Insights)
- [ ] Monitor push notification delivery
- [ ] OTA updates via `eas update` for non-native changes

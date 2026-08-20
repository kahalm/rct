# Android-TWA (APK/AAB)

Gebaut via GitHub-Action `android-twa.yml` (workflow_dispatch) aus `twa-manifest.json`
(Domain rct.oberschmid.homes). Signing-Keystore liegt als Repo-Secret
(ANDROID_KEYSTORE_BASE64/-PASSWORD, ANDROID_KEY_PASSWORD); Original + Passwörter:
/opt/stacks/rct/android-keystore/ auf der Box. Alias: rct.

Wichtig: Die Icon-URLs müssen live erreichbar sein (Deploy vor dem ersten Build) und
für die adressleisten-freie TWA braucht es assetlinks.json (Digital Asset Links) unter
https://rct.oberschmid.homes/.well-known/assetlinks.json mit dem Cert-Fingerprint —
ohne sie läuft die App als Custom Tab (mit URL-Leiste).

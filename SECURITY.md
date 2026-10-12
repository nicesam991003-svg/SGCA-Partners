# Firebase web configuration and secret-scanning alerts

`js/firebase-init.js` contains the public Firebase web application configuration. Its API key identifies the project; it does not authenticate an administrator. Firebase allows publishing this configuration when API restrictions, Security Rules, and other applicable protections are correctly configured.

Do not reuse a Firebase browser key for Gemini. The generator rejects configurations where `GEMINI_API_KEY` matches either `FIREBASE_API_KEY` or the browser configuration key. Keep the Gemini key in GitHub Actions secrets and restrict it to the Generative Language API. This check prevents key reuse; it does not inspect or configure Google Cloud restrictions.

## Review a Google API Key alert

1. Compare the detected key with the application's configuration without placing key values in reports or logs.
2. In the owning Google Cloud project, inspect the key's API restrictions. Allow only the required Firebase APIs. Do not allow the Generative Language API or other non-Firebase services on a public key.
3. Review Firestore Security Rules. Administrator access must be enforced by authenticated server rules. A front-end password prompt or hash is not server authorization. Public reads should expose only published reports; drafts and writes should require an authorized administrator.
4. If a key allowed services that should remain private, configure and test a replacement, revoke the old key, and review available usage logs. Update all consumers before revocation to avoid an outage.
5. Close a GitHub alert with a truthful resolution and evidence. Do not claim revocation unless it happened. An intentionally public, adequately restricted Firebase key can be documented as such after checking the configuration. Do not disable scanning or rewrite key strings simply to hide an unresolved alert.

As of the 2026-10-12 audit, unauthenticated Firestore writes were accepted and owning-project access was required to repair the server configuration. API restrictions had not yet been verified. Do not treat this document or the browser password masking as completion of that server hardening.

The automatic generator currently writes through the Firestore REST API using the Firebase key. Moving database writes to an authenticated server identity must accompany tightening Firestore rules, or the generator and existing administrator flow will stop working.

References: [Firebase API keys](https://firebase.google.com/docs/projects/api-keys), [Firestore authentication and authorization](https://firebase.google.com/docs/firestore/security/rules-conditions), [GitHub alert resolution](https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-secret-scanning-alerts/resolving-alerts).

# Firebase web configuration and secret-scanning alerts

`js/firebase-init.js` contains the public Firebase web application configuration. Its API key identifies the project; it does not authenticate an administrator. Firebase allows publishing this configuration when API restrictions, Security Rules, and other applicable protections are correctly configured.

Do not reuse a Firebase browser key for Gemini. The generator rejects configurations where `GEMINI_API_KEY` matches either `FIREBASE_API_KEY` or the browser configuration key. Keep the Gemini key in GitHub Actions secrets and restrict it to the Generative Language API. This check prevents key reuse; it does not inspect or configure Google Cloud restrictions.

## Review a Google API Key alert

1. Compare the detected key with the application's configuration without placing key values in reports or logs.
2. In the owning Google Cloud project, inspect the key's API restrictions. Allow only the required Firebase APIs. Do not allow the Generative Language API or other non-Firebase services on a public key.
3. Review Firestore Security Rules. Administrator access must be enforced by authenticated server rules. A front-end password prompt or hash is not server authorization. Public reads should expose only published reports; drafts and writes should require an authorized administrator.
4. If a key allowed services that should remain private, configure and test a replacement, revoke the old key, and review available usage logs. Update all consumers before revocation to avoid an outage.
5. Close a GitHub alert with a truthful resolution and evidence. Do not claim revocation unless it happened. An intentionally public, adequately restricted Firebase key can be documented as such after checking the configuration. Do not disable scanning or rewrite key strings simply to hide an unresolved alert.

The owning account for `sgca-platform-7abbc` is `sim@sgca-partners.com`. Keep this company project. The separate personal project `sgca-platform` is not the website's database.

The security implementation replaces the shared browser password with Google authentication. Firestore rules allow only published reports to unauthenticated readers. Draft reads and all browser writes require a verified `sim@sgca-partners.com` Google sign-in. Publishing requires matching verified source metadata and reviewed translation. Enable the Google provider and authorize the site's domains before deploying the administrator UI and rules.

The weekly generator uses GitHub OIDC through `sgca-insight-generator@sgca-platform-7abbc.iam.gserviceaccount.com`. Its custom role grants database metadata, entity read/list, and create permissions only, without update or delete. The provider restricts tokens to repository ID `1234348521`, owner ID `283300781`, main, and `.github/workflows/weekly-insight.yml`. Do not create a long-lived service-account key. Manual workflow runs default to read-only access verification.

The intended public key restrictions are Firestore, Firebase Management, Identity Toolkit and Token Service APIs, with website referrers for `sgca-partners.com`, `www.sgca-partners.com` and this project's Firebase Hosting domains. Never enable Generative Language on this key.

Local checks: 12 source, translation and administrator tests, plus five Firestore emulator permission tests. Deployment and Cloud settings must be verified independently; passing local tests alone does not prove that production rules or key restrictions were applied. During the initial audit, anonymous writes were accepted, so do not close the alert until production protection is verified.

References: [Firebase API keys](https://firebase.google.com/docs/projects/api-keys), [Firestore authentication and authorization](https://firebase.google.com/docs/firestore/security/rules-conditions), [GitHub alert resolution](https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-secret-scanning-alerts/resolving-alerts).

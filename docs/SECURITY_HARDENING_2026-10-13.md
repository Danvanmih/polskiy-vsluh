# Security hardening — follow-up to PR #76

Updated: 2026-10-13. This document distinguishes code changes from account/hosting settings that require the repository owner.

## Code changes in PR #77

- Replaced PDF.js 3.11.174 with version-pinned patched PDF.js 4.2.67 ESM + matching worker, loaded only on importing PDF. Kept `isEvalSupported: false` and document size/page/text limits. The library is still delivered by cdnjs; that host is an explicitly allowed script source.
- Bundled byte-identical JSZip v3.10.1 from the upstream Git tag with license, removing third-party jsDelivr script execution.
- Added a restrictive CSP meta policy to the five main pages: no inline JS, no eval, restricted trusted script/image/frame origins; `base-uri 'self'`, `object-src 'none'`, `form-action 'self'`. This does **not** replace server-set CSP headers.
- Made video thumbnail URLs deterministic and restricted donation links to HTTPS URLs with precisely validated hostnames.
- Isolated normal ONAS launch in a sandboxed iframe **without** `allow-same-origin`, and used `noopener noreferrer` for its new tab. Raw exported game HTML remains public and directly accessible (see below).
- Pinned GitHub Actions first-party action SHAs; set read-only workflow defaults. Only the YouTube/phrase synchronization job has `contents: write`. Added a Dependabot GitHub Actions update schedule.
- Added static + Chromium security regression tests (CSP, actual PDF import, sandbox canvas and origin separation), and a read-only inventory of legacy exports.
- Kept prior sidebar and course design; no changes to users' localStorage or uploaded documents.

## Important limitations that require owner action

1. **Protect `master`**. The GitHub branch API previously returned `protected: false`. In repository Settings → Rules → Rulesets, create an active ruleset for `master`: require pull requests, at least one independent approval if collaborators are available, require passing CI, block force pushes and deletions, and restrict bypass. Configure bypass thoughtfully for scheduled catalog sync (both sync jobs currently push directly to master). Without an exception or a redesign of synchronization via PR, requiring PRs on all pushes will stop automatic updates; this must be coordinated before enabling.
2. **Credentials and access**. In GitHub Settings → Secrets and variables → Actions, verify who can edit repository secrets, rotate suspicious credentials, and review recent Actions logs. In Google Cloud Console restrict the YouTube key to *YouTube Data API v3* only, set quotas and alerts. IP address restrictions are difficult for dynamic GitHub-hosted runners; do not assume browser referrer restrictions apply to an Actions script.
3. **Enable GitHub security settings**. Enable secret scanning / push protection where available, Dependabot alerts, and check repository collaborators/deploy keys/personal tokens. Require MFA for collaborators; review unfamiliar sessions.
4. **Hardening GitHub Pages headers**. CSP supplied via `<meta>` cannot set `frame-ancestors`, HSTS, Permissions-Policy and some other response headers. For full header controls use a suitable hosting/CDN configuration; validate in an actual browser.
5. **Origin isolation**. GitHub Pages project sites under `https://danvanmih.github.io/` share the same browser origin across paths. Other code hosted at that hostname — including directly visited old ONAS exports — may read site-local storage. Sandbox wrapping the normal ONAS launch helps, but cannot protect against direct visits to the old HTML route. A separate custom domain for the learning site is the appropriate long-term origin boundary.
6. **Public audio and legacy pages**. All 37 `.m4a` files and archived HTML versions are publicly readable. Do not treat these as private subscriber content. To make them private, use authenticated storage instead of publishing in the Pages repository. Old ONAS game files contain dynamic code and are retained for compatibility; running them directly has more risk than the sandboxed entry.
7. **Remaining third-party execution**. YouTube's official iframe API still executes a YouTube script on the academy page to track real viewing. PDF.js 4.2.67 is imported dynamically from a pinned CDN URL without SRI. Self-hosting a verified PDF.js bundle with matching worker would eliminate that CDN runtime trust but requires asset provenance, license review and a tested migration; do not inject unverified hashes.
8. **No server authentication**. Local nicknames, local rankings and document import do not prove identities. Any future payment, verified leaderboard, moderation or authenticated private content needs a separate secure backend.
9. **Security warning / reputation**. Telegram/VK or other platforms warning about a link does not itself establish compromise or a false positive. Confirm the exact full URL without revisiting it, check the sender and obtain an explanation via the provider's official support.

## Verification

- The new Playwright test opens the five core pages in Chromium with CSP and imports an actual, generated PDF into a personal practice document.
- The sandbox test checks ONAS canvas startup and denial of access to first-party localStorage.
- Static tests check external script allowlists, patched PDF version, self-hosted JSZip, domain allowlist, pinned Actions and explicit permissions.
- A live phishing/malware reputation assessment, penetration test of every large legacy asset, historical secret scan and authenticated cloud settings audit are outside this PR.

**No website is demonstrably free of every possible vulnerability.** Treat all security checks as specific evidence, not a blanket certification.

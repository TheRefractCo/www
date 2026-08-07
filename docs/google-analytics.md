# Google Analytics: Refract quick guide

The site uses GA4 through one shared Astro component. Google stays completely unloaded until a visitor allows analytics. Page views are sent manually so Astro's client-side page transitions are counted once, and the measurement ID can be changed by route without editing page templates.

## 1. Configure deployment

The local `.env` file is ignored by Git. For GitHub Pages, open the repository on GitHub and go to **Settings → Secrets and variables → Actions → Variables**. Add:

| Variable | Value | Purpose |
| --- | --- | --- |
| `GOOGLE_ANALYTICS_ID` | your GA4 `G-...` ID | Default measurement ID for the whole site |
| `ANALYTICS_CONSENT_MODE` | `required` | Shows the banner and blocks Google until opt-in |
| `GOOGLE_ANALYTICS_PAPER_ID` | leave unset | Optional future ID for `/paper` and its descendants |

Run the **Deploy to GitHub Pages** workflow again after saving the variables.

Measurement IDs are visible in a deployed page's network requests because the browser needs them. They are not credentials. Environment configuration keeps them out of committed source and makes them easy to replace; it cannot make them secret in production.

Consent modes:

- `required` is the safe default for this site: no GA request, cookie, or event before opt-in.
- `not-required` hides the initial banner and starts analytics by default, while keeping the footer opt-out. Use it only if your legal/privacy requirements allow it for that deployment.
- `off` disables both analytics and the banner.

This static GitHub Pages site does not receive a visitor-country header, so it cannot reliably show the banner only in the EEA without adding a geolocation service. The current global `required` setting avoids that extra tracking and works everywhere.

## 2. Check the GA4 property once

In **Admin → Data collection and modification**:

1. Set **Data retention** to **2 months**.
2. Leave **Google Signals** off.
3. Do not link an advertising account unless the privacy design is deliberately revisited.

With the current single measurement ID, leave **Admin → Data streams → Web → your stream → Enhanced measurement → Page views → Show advanced settings → Page changes based on browser history events** on. The site sends one controlled initial page view and lets GA observe later Astro history changes, which avoids duplicates.

Before adding `GOOGLE_ANALYTICS_PAPER_ID`, turn **Page changes based on browser history events** off. With more than one route ID, the site automatically switches to fully manual page views so each route goes only to its intended property. Leaving GA history tracking on in that future multi-ID setup would double-count transitions.

You can keep useful standard measurements such as scrolls, outbound clicks, and file downloads on. They are still sent only after consent because the Google tag itself is not loaded before then.

## 3. Verify the installation

1. Open the site in a private window.
2. Before choosing, open browser developer tools → **Network** and search for `gtag` or `collect`. There should be no request to Google Analytics.
3. Select **Allow analytics**. A request for `gtag/js` and then GA collection requests should appear.
4. In GA, open **Reports → Realtime**. Your visit and events normally appear within seconds or minutes.
5. For **Admin → DebugView**, visit a URL with `?ga_debug=1`, accept analytics, and navigate around. The code adds GA debug mode while that query parameter is present.
6. Select **Analytics choices** in the site footer, choose **No thanks**, and confirm that new GA collection requests stop. The site also removes accessible `_ga` cookies.

If nothing appears, check that the GitHub repository variable is spelled exactly `GOOGLE_ANALYTICS_ID`, that the latest Pages workflow succeeded, and that an ad/tracker blocker is not suppressing GA.

## 4. What is measured

GA4 automatically receives its standard visit/session context after consent. Refract also sends these intentional events:

| Event | Meaning | Useful parameters |
| --- | --- | --- |
| `page_view` | A real page load or Astro page transition | built-in page title, location, referrer |
| `paper_store_click` | A visitor chose a Microsoft Store control | `interaction_action`, `interaction_location` |
| `paper_detail_click` | A visitor chose a Paper detail/privacy link | `interaction_action`, `interaction_location` |
| `contact_action` | Opened mail or copied an address | `interaction_action`, `interaction_label` |
| `social_click` | Chose a Refract social profile | `social_network`, `interaction_location` |
| `carousel_control` | Used a screenshot carousel arrow | `carousel_name`, `direction` |

The interaction parameters contain fixed interface labels only. Email addresses, message text, files, and other user-entered content are not sent.

## 5. Make GA useful without getting lost

Start with three places:

1. **Reports → Realtime** answers “is tracking working right now?”
2. **Reports → Engagement → Pages and screens** shows which pages people actually visit.
3. **Reports → Engagement → Events** shows the custom events above.

Mark `paper_store_click` as a **key event** in **Admin → Events**. That gives you one meaningful outcome to compare with traffic sources instead of optimizing for page views alone.

To report on the custom parameters, go to **Admin → Custom definitions → Create custom dimension**. Create event-scoped dimensions only for questions you will use—for example `interaction_location` to compare the home, projects, and Paper page Store controls. GA may take 24–48 hours to populate a new custom dimension, and it does not backfill old events.

Useful first questions:

- Which landing pages lead to `paper_store_click`?
- Does `/paper` turn a larger share of visits into Store clicks than the homepage?
- Which referrals or campaigns bring engaged visitors rather than raw traffic?
- Where do people leave before reaching a Paper action?

Avoid collecting more events until one of them answers a real product or content decision.

## 6. Swapping IDs by route later

Set `GOOGLE_ANALYTICS_PAPER_ID` to another `G-...` ID and redeploy. The route table in `src/config/analytics.ts` selects that ID for `/paper` and descendants; every other route keeps `GOOGLE_ANALYTICS_ID`.

For another route, add one explicit environment variable and route entry to the same file. Put the most specific prefixes before `/`, as the current Paper override does.

## 7. Should Refract add Microsoft Clarity too?

Not yet. GA now answers the first useful questions—where visitors arrive, which pages they read, and whether they choose the Paper Store. Clarity adds heatmaps and session replay, but also adds another third-party script, provider, consent signal, and privacy-policy surface. Microsoft requires a valid consent signal for full Clarity behavior in the EEA, UK, and Switzerland, and its reports are less reliable without one.

Reconsider Clarity when GA shows enough `/paper` traffic to investigate a specific usability question, such as a large gap between landing and Store clicks. If added later, load it through the same explicit opt-in, connect the Clarity consent API, use strict masking, test recordings for accidental disclosure, and update the website policy before launch.

## Official references

- [Google: set up consent mode](https://developers.google.com/tag-platform/security/guides/consent)
- [Google: measure page views](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [Google: custom events](https://support.google.com/analytics/answer/12229021)
- [CNIL: using analytics on websites and applications](https://cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications)
- [Microsoft: Clarity reporting without cookie consent](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-without-cookie-consent)

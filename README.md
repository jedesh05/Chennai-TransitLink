# Chennai TransitLink

## Open and test on Windows

Extract the full **Chennai-TransitLink.zip** in File Explorer and double-click **index.html**. The planner and the directory work offline. For location access, use a browser that allows location for local files, or test the site on HTTPS after publishing.

- Search **Kanchipuram → Chengalpattu**, and try a separate search with **Holiday service** checked. The toggle uses supplied Sunday schedules for suburban/MRTS and Metro on the selected date.

## Publish on GitHub Pages

1. Upload the extracted files to the root of your repository. Keep the assets folder beside index.html.
2. In **Settings → Pages**, choose **Deploy from a branch**, then choose your main branch and **/(root)**.
3. Open the HTTPS address shown under **Settings → Pages**.

[GitHub Pages publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Timing and coverage



Use **Route preference** to bring an available fewer-transfer or fewer-stop result to the top. The quickest local estimate remains available for comparison. Open **Via stop and holiday service** for the optional waypoint and Sunday timetable controls.


Trip cards show boarding order, direction, stops and transfer waits when supported by the timetable. Where no train- or Metro-only route is found in the standard eight-hour search, the planner checks up to 24 hours. Via points may be passed aboard a service without forcing an extra transfer.



Use the bottom navigation to open Plan & Routes, Stations, Map, or Saved trips. Save a trip from its results to rerun it later with the current Chennai time. Saved trips are stored in the current browser. When served over HTTPS, the site can be installed from a supporting browser and caches the planner for offline use after its first successful visit. Opening index.html directly also continues to work.

Below the planner, the Metro and Suburban / MRTS columns have independent searches. The selected train loads an ordered schematic route map. Scroll horizontally and select a station to see its arrival, departure, and distance from the train’s origin. The schematic represents timetable order without geographic scale.

Open **Stations** to view upcoming arrivals and departures side by side in Chennai time. The board refreshes every 15 seconds. It uses scheduled suburban/MRTS events and estimated Metro events from the bundled timetable. It does not receive vehicle locations or live delay updates.



The rail map uses [DataMeet railway coordinates](https://github.com/datameet/railways) (CC0) and [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL). Some interchange locations use approximate positions. Lines link timetable stations and approximate the railway alignment. The map is bundled for offline use and uses no street basemap.

Log in at the top right to use Google, verified email or an SMS code once Firebase is configured. The local-profile option opens saved trips from the current browser using the profile name. Online accounts separate saved trips by account ID on the current browser. Saved trips are stored on this device.

The bottom navigation opens four views. Plan & Routes contains the journey planner, results, service browser and rail map. Stations contains the arrival and departure boards. Map shows the offline OpenStreetMap extract, and Saved trips contains local saved journeys. Use the browser’s Back button to return to a previous view.

**Map** displays roads, railway lines, coast, waterways and place labels extracted from the supplied OpenStreetMap XML export. The compact map asset is bundled offline. The original XML export is kept in Downloads. Map data © OpenStreetMap contributors, ODbL.

MEMU schedules added: 66045, 66046, 66050, 66055 and 66056. Search MEMU in Routes or select Show only MEMU on the suburban board. Sources: [Southern Railway notice](https://sr.indianrailways.gov.in/documents/press-release/preview/1028), [66045](https://etrain.in/train/66045), [66046](https://etrain.in/train/66046), [66050](https://etrain.in/live-train-status/66050), [66055](https://etrain.in/live-train-status/66055) and [66056](https://etrain.in/train/66056). Times are scheduled snapshots. No Kanchipuram MEMU schedule was added because available listings disagreed on numbers or route details.

## Scheduled service updates

The website checks service-updates.json once a minute when opened over HTTP or HTTPS. The shipped file is marked unconfigured. To enable automatic updates, arrange authorized NTES and CMRL data access and run a server-side adapter that publishes fresh snapshots to this same-origin path. Use official trip identities, place credentials on the server, and publish only operator-confirmed full cancellations and trip-wide delays. The static ZIP does not include an upstream operator adapter or credentials. Opening from File Explorer uses the bundled timetable without polling.

For a connected feed, publish an object with an expiresAt UTC timestamp and an updates array. Each update has mode (rail or metro), source (NTES or CMRL respectively), date (starting date in IST, YYYY-MM-DD), service, and status (cancelled or delayed). For rail, service is the train number as a string. For Metro, service is the line name, a vertical bar, then the terminal name (for example Blue Line|Airport). Metro records also require start, the scheduled terminal departure as whole minutes after IST midnight. Delayed updates require delayMinutes (1 to 720). Delete a record from the next snapshot to restore the base schedule. Use a short expiry and publish the complete snapshot atomically. The app ignores expired records and reverts to schedule times when updates expire. Station boards label affected runs, and the planner excludes cancelled runs. Partial cancellations, skipped stations and per-stop timing revisions are not applied.

Official references: [NTES integration specification](https://rb.indianrailways.gov.in/uploads/directorate/tele_comm/ImpLetters/API_based_NTES-IPIS_Integration.pdf) · [CMRL notices](https://chennaimetrorail.org/press-release/)

Select **Show on map** on a journey result to display the stops with available coordinates on the Map view. Dashed connections are approximate. Use **Back to journey results** to return to your search.


## MTC bus schedules

TransitLink uses the [Reclaim Chennai MTC feed](https://github.com/reclaimchennai/India_GTFS/tree/main/tamil-nadu/chennai) behind the [MTC Bus Explorer](https://mtc.reclaimchennai.city/). The bundled snapshot includes 1,103 route numbers, 4,554 stop patterns, and 3,597 stops used by scheduled trips. The feed calendar runs from January 2026 through December 2027. Times are published schedules in IST. Bus GPS and delays are not included. Walking transfers are approximated from stop coordinates. Map lines connect the published stop positions in sequence.

To check the import, open Plan & Routes, search for E18 in MTC Bus, expand the stop list, and select Show on map. In the planner, try Chennai Beach to Kilambakkam Bus Terminus with a morning departure and bus and suburban options enabled.

## Set up online sign-in for GitHub Pages

1. Create a project in the [Firebase console](https://console.firebase.google.com/) and register a Web app. Copy its public web configuration into auth-config.js. Use the Firebase web values, never a service account key.
2. In Authentication → Sign-in method, enable Google, Email/Password and Phone. Set the project support email when enabling Google.
3. In Authentication → Settings → Authorized domains, add your GitHub Pages hostname, such as YOUR-NAME.github.io, or your custom domain. Enter only the hostname. Use the HTTPS website to test all three methods.
4. To send real phone codes, link Cloud Billing and allow India in the authentication SMS region policy. Firebase charges may apply. Use Firebase's fictional test phone numbers to test first. [Phone authentication setup](https://firebase.google.com/docs/auth/web/phone-auth)
5. Test with accounts you control. Close and reopen the site to confirm the session persists, then log out. For email, follow the inbox verification link before logging in. For phone, complete reCAPTCHA and enter the SMS code.

### Rail map station board and train positions

The rail map opens on the full color-coded network. Choose Fit route to focus on the selected train or Show all lines to return to the network. Tap a station to see its name and any times for the selected train. The train marker refreshes every 15 seconds. Hosted pages also poll for operator data every minute.

If your authorized feed supplies train coordinates, include an optional positions array in service-updates.json alongside updates. Each entry requires source set to NTES, service as the train number string, observedAt as an ISO 8601 UTC timestamp, and numeric lat and lng. Publish only observed operator coordinates. TransitLink uses the newest valid position for each train, discards positions more than three minutes old, and clearly labels timetable estimates when a fresh position is unavailable.

### Planner and service types

MTC route numbers, stop order, departures and service tiers come from the bundled Reclaim Chennai GTFS snapshot. Displayed badges use Ordinary, Deluxe, AC, and Express. The interface displays the source tag EXECUTIVE as Deluxe. Unmapped tags have no badge. The raw schedules and source tags are preserved.

For a browser location check, open the HTTPS website, allow location permission, and choose Use my location. The planner considers nearby stops for the selected modes and includes the estimated walk to the chosen stop. You can enter a stop manually if the browser blocks location or its location estimate is out of range.

Sample timetable check for 23 November 2026 at 09:00 IST, Chennai Beach to Kilambakkam Bus Terminus: train 40523 and bus 21G via Chromepet, arriving 10:06. Direct bus E18 from Beach Station is another option, scheduled from 09:16 to 10:35. These are scheduled or estimated times.
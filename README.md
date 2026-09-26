# Trip Pins

A phone app for places you might want to go. Share a spot from Google Maps (or paste a link, or type a name), add a line on why, and it lands in a Google Sheet you own. Later, open the list or map and tap **Go**: Google Maps opens with directions.

Everything's free. No Google Cloud account, no billing, no API keys.

Setup takes about 20 minutes, in four parts. You do parts 1 and 2 once, part 3 on each phone, and part 4 on each iPhone.

---

## 1. The Google Sheet (about 5 minutes)

1. Make a new Google Sheet (sheets.new). Name it something like *Trip Pins data*.
2. **Extensions → Apps Script.** Delete the sample code, paste in all of `Code.gs`, then press save (the disk icon).
3. In the toolbar, pick the function **setup** and press **Run**.
   - Google asks for permission. Choose your account. When it says *Google hasn't verified this app*, tap **Advanced → Go to … (unsafe)**. It's your own script, so this is expected.
   - The **Execution log** at the bottom shows `Your KEY is: …`. Copy it somewhere.
4. **Deploy → New deployment.** Click the gear next to *Select type* and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Press **Deploy** and copy the **Web app URL** (it ends in `/exec`).

The URL and key together work like a password. Anyone with both can read and add to your list, so don't post them anywhere. Neither one goes into GitHub.

> Changed `Code.gs` later? Go to **Deploy → Manage deployments**, press the pencil, set *Version* to **New version**, then **Deploy**. The URL stays the same.

## 2. The website on GitHub Pages (about 5 minutes)

1. On GitHub, make a new **public** repository, e.g. `trippins`.
2. **Add file → Upload files.** Drag in everything from this folder *except* `Code.gs` (it's harmless there, just not needed): `index.html`, `manifest.webmanifest`, `sw.js`, and the four `.png` icons. Commit.
3. **Settings → Pages.** Under *Build and deployment*, pick **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute or so the site is live at `https://YOUR-NAME.github.io/trippins/`.

## 3. Each phone (2 minutes)

1. Open the site on the phone.
2. Tap the **gear**. Fill in:
   - **Trip name**, e.g. *Osaka, October*
   - **Where you're travelling**, e.g. *Osaka, Japan* (this helps typed names find the right place)
   - The **web app URL** and **key** from part 1
3. Press **Save & connect**. The top line should read *0 places · synced*.
4. Put it on your home screen:
   - **Android (Chrome):** menu ⋮ → **Add to Home screen** → **Install**.
   - **iPhone (Safari):** Share button → **Add to Home Screen**.
   - On iPhone the home-screen app keeps its own settings, separate from Safari's. Open it from the home screen once and fill in the gear settings again.

### Adding from Android: Google Maps → Share → Trip Pins

Once installed, Trip Pins shows up in Android's share sheet. In Google Maps, open a place, tap **Share**, then pick **Trip Pins**. The app opens with the place looked up; type why you want to go and tap **Save**. It also works when sharing a page from Chrome.

If Trip Pins doesn't appear in the share list, open the app once from the home screen, then try again. On some phones it hides under **More**.

## 4. Adding from iPhone: a Shortcut (about 10 minutes, once)

iPhones don't let web apps appear in the share sheet, so a Shortcut does the job, and it's arguably faster: you never leave Google Maps.

In the **Shortcuts** app, tap **+** and build this:

1. Name it **Save to Trip Pins**. Tap the **ⓘ** (info) button and turn on **Show in Share Sheet**. Close that panel.
   - The first line now reads *Receive **Any** input from Share Sheet*. Tap *If there's no input* and choose **Ask For → Text**, so it also works from the home screen.
2. Add the action **Ask for Input**. Set the prompt to `Why go? (optional)`.
3. Add **Get Contents of URL**.
   - URL: your **web app URL** from part 1
   - Tap **Show More**. Method: **POST**. Request Body: **JSON**.
   - Add four **Text** fields:

     | Key | Value |
     |---|---|
     | `k` | your key |
     | `action` | `add` |
     | `q` | *Shortcut Input* (tap the variable bar above the keyboard) |
     | `why` | *Provided Input* |

4. Add **Get Dictionary Value**: get **Value** for `name` in *Contents of URL*.
5. Add **Show Notification**: `Saved: ` followed by the *Dictionary Value* variable.

**To use it:** in Google Maps (or Safari on a Google result) tap **Share**, scroll to the actions list, and tap **Save to Trip Pins**. Type why, tap Done, and you'll see *Saved: Kuromon Ichiba Market* a couple of seconds later. The category is guessed from the name; you can change it in the app.

If the notification says *Saved:* with no name, the key or URL is probably wrong. Run it again and check the *Contents of URL* output in the Shortcuts editor.

---

## Several phones, one Sheet

Point as many phones at the same Sheet as you like (yours, a travel partner's, an iPad). They all share one list.

- **Trip name and area** are stored in the Sheet. Set them on the first phone; a phone you connect later picks them up by itself (leave those two boxes blank when connecting it). Change them on any phone and the rest follow.
- **New places** show up on the other phones when the app is next opened, when you tap refresh, or within about 90 seconds while it's open.
- **The same place saved twice** (say you both share Kuromon Market) stays as one pin. The second person's note is added under the first.
- **Edits** only change what you actually touched. If you fix the type while your partner adds a note, both changes stick.
- **Visited ticks are shared.** If one of you ticks a place, it's ticked for everyone.
- **Deleted on one phone, still showing on another?** Tapping it tells you it's gone and removes it. Nothing breaks.

Two phones can save at exactly the same moment; the Sheet takes them one at a time.

## Using it

- **List** shows the nearest places first once you tap *📍 Nearest first* and allow location. Visited ones sink to the bottom.
- **Map** shows every place as a coloured pin, and you as a blue dot. Tap a pin for its card.
- **Go** opens Google Maps with directions. The square arrow button opens the place's Google Maps page (hours, reviews, photos).
- **✓** marks a place as visited. The chip *Hide visited* tidies the list.
- **Edit** (pencil) changes anything. If a place has *No pin yet*, fix the name or area and tap **Find**.
- **Saved the wrong thing?** Tap **Undo** in the message that pops up after saving. Later on, open **Edit** and tap **Delete** twice (the first tap turns it red, the second removes it). Deleting a row in the Sheet works too.
- You can also tidy or bulk-edit straight in the Google Sheet; the app picks up changes when you reopen it.
- The app keeps a copy on the phone, so the list (and map tiles you've already viewed) still work on a weak signal. Saving needs a connection.

## What happens behind the scenes

When you share a link, the script in your Sheet follows Google's short link (`maps.app.goo.gl/…`) to the full Maps address, which usually carries the place name and exact coordinates. When a link doesn't give coordinates (Google Search results, typed names), it falls back to Google's geocoder, which Apps Script offers free. Google caps free lookups per day; a trip uses a few dozen.

Google sometimes changes the shape of its links. When a lookup misses, the place still saves with its name and link, and **Go** searches Google Maps for it by name.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app |
| `manifest.webmanifest` | Lets phones install it, and puts it in Android's share sheet |
| `sw.js` | Offline support |
| `icon-*.png`, `apple-touch-icon.png` | Home-screen icons |
| `Code.gs` | The Google Sheet backend (goes in Apps Script, not GitHub) |

The map uses Leaflet (the free map library) with OpenStreetMap's own tiles, and neither needs a key or an account. Map data © OpenStreetMap contributors.

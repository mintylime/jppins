# Trip Pins

A phone app for places you might want to go. Share a spot from Google Maps (or paste a link, or type a name), add a line on why, and it lands in a Google Sheet you own. Later, open the list or map and tap **Go**: Google Maps opens with directions.

Everything's free. No Google Cloud account, no billing, no API keys.

**Been sent a link to someone's trip?** You only need [Joining a trip](#joining-a-trip) below (about 2 minutes). The rest of this page is for whoever sets it up. Inside the app, the **?** button next to the settings gear shows the same steps for Android or iPhone.

---

## Joining a trip

### 1. Connect

- **Got an invite link** (by WhatsApp, Messages or email)? Open it. You're connected, and the trip name comes with it.
- **Got a URL and a key instead?** Go to the trip's page (for example https://mintylime.github.io/jppins/), tap **Connect**, paste both, and tap **Connect**.

### 2. Put it on your home screen

**Android (Chrome):** tap the menu **⋮** (top right), then **Add to Home screen** or **Install**. It opens like a normal app and keeps the connection.

**iPhone (Safari only):**

1. Tap the Share button (the square with an arrow), then **Add to Home Screen → Add**.
2. Open Trip Pins from the home screen. It starts blank; iPhones give home-screen apps their own storage, separate from Safari.
3. Go back to the chat, press and hold the invite link, and tap **Copy**.
4. In Trip Pins, tap **Connect → Paste → Connect**. You only do this once.

### 3. Save places from Google Maps

**Android:** in Google Maps, open a place, tap **Share**, and pick **Trip Pins**. Type why you want to go, then tap **Save**. Not in the share menu? Open Trip Pins once from the home screen and try again; on some phones it hides under **More**.

**iPhone:** in Google Maps, open a place, tap **Share → Copy link**. Open Trip Pins, tap **+ Add → Paste**, type why, and tap **Save**. iPhones don't let web apps into the share menu, so if you save a lot, ask the organiser for the [Shortcut](#4-adding-from-iphone-a-shortcut-about-10-minutes-once); it saves straight from Google Maps.

No link handy? Tap **+ Add** and type a name, like *Kuromon Market*.

### 4. Use the shared list

- **Go** opens Google Maps with directions.
- **List:** tap **📍 Nearest first** once you're out and about. **Map:** everyone's places as coloured pins, with you as a blue dot.
- **✓** marks a place as visited; the pencil fixes a name or note.
- It's one live list. What you add, edit or tick shows on everyone's phone within about 90 seconds.
- *"Key changed"*? Ask the organiser for a fresh invite link.

---

## Setting it up (for the organiser)

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
   - Who has access: **Anyone**. Not *Anyone with Google account*: that one makes phones hit a sign-in page, and the app can't connect.
   - Press **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. **Check it on your phone.** Open the web app URL in the phone's browser. You should see a short line of text containing *"Your Sheet is reachable"*. If you see anything else, jump to [If it won't connect](#if-it-wont-connect).

If *Anyone* isn't offered in step 4, the Google account belongs to a work or school organisation that blocks public web apps. Make the Sheet in a personal Gmail account instead.

The URL and key together work like a password. Anyone with both can read and add to your list, so don't post them anywhere. Neither one goes into GitHub.

> Changed `Code.gs` later? Go to **Deploy → Manage deployments**, press the pencil, set *Version* to **New version**, then **Deploy**. The URL stays the same.

## 2. The website on GitHub Pages (about 5 minutes)

1. On GitHub, make a new **public** repository, e.g. `trippins`.
2. **Add file → Upload files.** Drag in everything from this folder *except* `Code.gs` (it's harmless there, just not needed): `index.html`, `manifest.webmanifest`, `sw.js`, and the four `.png` icons. Commit.
3. **Settings → Pages.** Under *Build and deployment*, pick **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute or so the site is live at `https://YOUR-NAME.github.io/trippins/`.

## 3. Connecting phones

### The first phone (2 minutes, once per Sheet)

1. Open the site on the phone and tap **Connect**.
2. Paste the **web app URL** and the **key** from part 1, then tap **Connect**.
3. It asks you to name the trip, once: a **trip name** (e.g. *Osaka, October*) and **where you're travelling** (e.g. *Osaka, Japan*, which helps typed names find the right place). Tap **Save trip details**.

### Every other phone (30 seconds)

1. On a phone that's already connected, open **Settings → Add another phone**. It opens your phone's share menu; send the link by Messages, WhatsApp, AirDrop or email.
2. Open the link on the new phone. It connects and picks up the trip name and area from the Sheet. There's nothing to type.

Treat that link like a house key: anyone who has it can see and change your list.

### Put it on the home screen

- **Android (Chrome):** menu ⋮ → **Add to Home screen** → **Install**. It keeps the connection.
- **iPhone (Safari):** Share button → **Add to Home Screen**. The home-screen app on an iPhone starts with its own empty settings, separate from Safari's. Open it, tap **Connect**, and paste the same link (tap **Paste**; the key box disappears because the link carries it).

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
   - URL: your **web app URL** (on a connected phone: **Settings → URL and key**, then Copy)
   - Tap **Show More**. Method: **POST**. Request Body: **JSON**.
   - Add four **Text** fields:

     | Key | Value |
     |---|---|
     | `k` | your key (same place, Copy) |
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

- **Trip name and area** live in the Sheet. The first phone sets them; phones that join pick them up. Change them on any phone (**Settings → This trip**) and the others follow. Only the box you changed is sent, so two people editing different boxes don't undo each other, and clearing a box sticks.
- **Switching to a different Sheet** (say, a new one for Tokyo): open that Sheet's link. The app asks before switching and never copies one trip's name into another. Nothing is deleted from either Sheet.
- **Leaving:** **Settings → Disconnect this phone** (tap twice). The phone forgets the Sheet; the places stay in it.
- **New places** show up on the other phones when the app is next opened, when you tap refresh, or within about 90 seconds while it's open.
- **The same place saved twice** (say you both share Kuromon Market) stays as one pin, and the second person's note is added under the first. "Same" means the same Google place, or the same name within 100 m. Two FamilyMarts in different streets stay separate.
- **Edits** only change what you actually touched. If you fix the type while your partner adds a note, both changes stick.
- **Visited ticks are shared.** If one of you ticks a place, it's ticked for everyone.
- **Deleted on one phone, still showing on another?** Tapping it tells you it's gone and removes it. Nothing breaks.

Two phones can save at exactly the same moment; the Sheet takes them one at a time.

**If you ever change the key** (run `resetKey` in Apps Script), every phone shows *key changed, reconnect*. Send a fresh link from any phone that you've reconnected (or from the first phone after pasting the new key), and update the key in the iPhone Shortcut.

## Using it

- **?** (next to the gear) shows the joining and everyday steps, with separate tabs for Android and iPhone. It opens on the right one for the phone.
- **List** shows the nearest places first once you tap *📍 Nearest first* and allow location. Visited ones sink to the bottom.
- **Map** shows every place as a coloured pin, and you as a blue dot. Tap a pin for its card.
- **Go** opens Google Maps with directions. The square arrow button opens the place's Google Maps page (hours, reviews, photos).
- **✓** marks a place as visited. The chip *Hide visited* tidies the list.
- **Edit** (pencil) changes anything. If a place has *No pin yet*, fix the name or area and tap **Find**.
- **Saved the wrong thing?** Tap **Undo** in the message that pops up after saving. Later on, open **Edit** and tap **Delete** twice (the first tap turns it red, the second removes it). Deleting a row in the Sheet works too.
- You can also tidy or bulk-edit straight in the Google Sheet; the app picks up changes when you reopen it.
- The app keeps a copy on the phone, so the list (and map tiles you've already viewed) still work on a weak signal. Saving needs a connection.

## If it won't connect

*"Couldn't reach your Sheet"* (Safari used to say *"Load failed"*) means the phone got no usable reply, so the key hasn't even been checked. Open the web app URL with `?action=ping` on the end in the phone's browser (the app gives you this link) and match what you see:

| The test page shows | Fix |
|---|---|
| *"Your Sheet is reachable"* | The Sheet's fine. Go back and tap Connect again. |
| A Google sign-in page, or *"You need access"* | Deploy → Manage deployments → pencil → *Who has access*: **Anyone** → Deploy. |
| *"Authorization is required"* | In Apps Script, run **setup** again and approve, then deploy a New version. |
| *"Script function not found: doGet"* | The new Code.gs isn't live: Deploy → Manage deployments → pencil → Version: **New version** → Deploy. |
| *"Sorry, unable to open the file at this time"* | You're signed into several Google accounts in that browser. Try a private window. |
| *"…not attached to a Google Sheet"* | The script was made at script.google.com. Make it from the Sheet instead (Extensions → Apps Script). |
| *"Run setup()…"* | Run **setup** in Apps Script, then deploy a New version. |

*"The key doesn't match this Sheet"* is different: the Sheet answered, so only the key is wrong. Copy it again from the Apps Script execution log (run **setup** to show it).

## What happens behind the scenes

The app talks to your Sheet by loading its reply like a small script file, rather than the usual background request. Safari blocks the usual kind when Google redirects it between its own servers, which is where the old *"Load failed"* came from. The usual kind is still used as a backup, and for very long notes.

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

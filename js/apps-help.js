/* Blockvile Plus OS — Help (searchable guide) and Feedback (send bugs, ideas and praise) */
(() => {
  const { esc, store } = window.BV;
  const CFG = () => window.BV_CONFIG || {};
  const ver = () => CFG().version || "";
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const btnOpen = (id, label) => `<button class="btn ghost" data-open-app="${id}">${label}</button>`;
  const btnDo = (act, label, primary) => `<button class="btn${primary ? "" : " ghost"}" data-do="${act}">${label}</button>`;
  const go = (id, label) => `<button class="link-btn" data-goto="${id}">${label}</button>`;

  /* ================= Help articles ================= */
  const ARTICLES = [
    { id: "start", icon: "👋", title: "Getting started", tags: "begin new basics tour first time welcome", body: () => `
      <p>Blockvile Plus is a complete home screen with apps, settings and three layouts. Here's the quick tour:</p>
      <ol><li><b>Unlock:</b> swipe up on the lock screen, or tap it. Press <kbd>Esc</kbd> on a keyboard.</li>
      <li><b>Open apps:</b> tap an icon on the home screen or dock.</li>
      <li><b>Notifications:</b> swipe down from the top-left. <b>Control Centre:</b> swipe down from the top-right.</li>
      <li><b>Go home:</b> swipe up from the bottom bar, or tap the line at the bottom.</li>
      <li><b>Search anything:</b> tap the search bar on the home screen or press <kbd>Ctrl</kbd>+<kbd>K</kbd>.</li></ol>
      <div class="tip">The three round buttons in the corner are shortcuts for <b>Dark mode</b>, <b>switch layout</b> and <b>Exit</b>.</div>
      ${btnDo("install", "📲 Install Blockvile on this device", true)}${go("modes", "Next: the three modes →")}` },
    { id: "modes", icon: "📱", title: "Phone, Tablet and Laptop modes", tags: "mode layout desktop tablet split screen windows rotate", body: () => `
      <p>Switch layout from the Control Centre, Settings, or the <b>mode button</b> in the corner. On a keyboard, press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd>, or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd>.</p>
      <h4>📱 Phone</h4><p>Home screen, dock and gestures. Apps open full screen. Turn on <b>Rotate</b> in the Control Centre for landscape.</p>
      <h4>📲 Tablet</h4><p>Open two apps and they sit side by side in split screen.</p>
      <h4>💻 Laptop</h4><ul><li>Menu bar at the top, dock at the bottom, and a start button that opens all your apps.</li>
        <li>Drag windows by their title bar and resize them from the corner.</li>
        <li><b>Snap:</b> drag a window to the left or right edge to fill half the screen, or to the top to maximise. <kbd>Alt</kbd>+arrow keys do the same.</li>
        <li>Right-click the desktop or an app for more options.</li></ul>` },
    { id: "exit", icon: "⏏", title: "Exit Blockvile and use your device", tags: "exit application exit quit close leave original os normal home screen launcher back", body: () => `
      <p>Press <b>Exit</b> any time — the red ⏻ button in the corner, <code>application exit</code> in the Terminal, <b>Exit Blockvile Plus OS</b> in the Control Centre, or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd>.</p>
      <h4>What happens when you exit</h4>
      <ul><li><b>Android app:</b> you go straight back to your phone's usual home screen. If a temporary takeover was on, it ends and Home goes to your usual home screen again.</li>
        <li><b>Installed app</b> (home-screen or desktop icon): Blockvile's window closes and you're back on your device.</li>
        <li><b>In a browser tab:</b> Blockvile closes and leaves full screen. You can close the tab, go back to the previous page, or jump back in.</li>
        <li><b>Inside another website:</b> Blockvile closes and the rest of the page works as normal.</li></ul>
      <div class="tip">Nothing is lost when you exit — your apps, files and settings are still there next time.</div>` },
    { id: "fulldevice", icon: "⛶", title: "Temporary takeover", tags: "temporary takeover full screen whole device kiosk system take over application exit terminal", body: () => `
      <p>Tap <b>Temporarily let Blockvile take over this device</b> (on the home screen, in the Control Centre or in Settings) and Blockvile acts as your device's system — <b>only until you end it</b>. It is never permanent, never starts by itself, and is never saved.</p>
      <h4>How to end it</h4><ul><li>Type <code>application exit</code> in the <b>Terminal</b>.</li>
        <li>Or press the red <b>⏻ Exit</b> button, or tap the takeover button again.</li>
        <li>Reloading the page, closing the app or (on Android) restarting the phone also ends it.</li></ul>
      <h4>📱 Android app</h4><ul><li>Android asks first. While it's on, pressing Home comes back to Blockvile and all your phone's apps are in the <b>Android Apps</b> drawer.</li>
        <li>Ending it hands the phone straight back to its own home screen.</li>
        <li>The Control Centre controls the real phone: brightness, volume and torch change for real, and Wi-Fi, Bluetooth, data and airplane mode open the phone's own switches.</li></ul>
      <h4>🌐 Browser or installed app</h4><ul><li>Blockvile fills the whole screen, hides the browser's bars, keeps the screen awake and captures keys such as <kbd>Esc</kbd>.</li>
        <li>If you leave full screen, the next tap brings it back — until you end the takeover. Closing the tab asks you first.</li></ul>
      <div class="tip">Terminal commands: <code>application takeover</code>, <code>application status</code>, <code>application exit</code>.</div>
      ${btnOpen("terminal", "⌨️ Open Terminal")}` },
    { id: "account", icon: "👤", title: "Accounts, Digital SIM and AI", tags: "account sign in login google microsoft email supabase digital sim number wifi charge messages ai assistant link device gmail outlook onedrive drive", body: () => `
      <p>Signing in is optional. Everything else in Blockvile works without it.</p>
      <h4>👤 Sign in</h4><ul><li>Use <b>Google</b>, <b>Microsoft</b> or <b>any email address</b>.</li>
        <li>Under <b>This device</b> you can link this device to your account, and unlink it later.</li>
        <li>Tap <b>Link Google / Microsoft mail, calendar &amp; files</b> to see unread mail, events and recent files. It's read-only and only for this visit.</li>
        <li>The tiles open Gmail, Drive, Outlook, OneDrive, Teams and more. In the Android app they open the real app if it's installed.</li></ul>
      <h4>📶 Digital SIM</h4><ul><li>Only available while you're signed in.</li>
        <li>You get a Blockvile number like <b>BV 4821 7730</b> to message other Blockvile users.</li>
        <li>It <b>charges 1% a minute while you're on Wi-Fi</b>. Each message uses 2%.</li>
        <li>It also <b>banks Wi-Fi data</b> (5 MB a minute, up to 500 MB). When Wi-Fi is off or unavailable, messages spend 2 MB each from it. With no connection they wait and send when you're back online.</li>
        <li>It is <b>not a phone-company SIM</b>: no calls or texts to normal numbers. The banked data is an allowance for Blockvile's own messages — it can't create internet.</li></ul>
      <h4>✨ Blockvile AI</h4><ul><li>Say “open Notes”, “dark mode on” or “switch to laptop mode” — works without internet.</li>
        <li>Sign in to ask general questions.</li></ul>
      ${btnOpen("accounts", "👤 Open Accounts")}${btnOpen("ai", "✨ Open Blockvile AI")}` },
    { id: "update", icon: "⬆️", title: "Updating Blockvile", tags: "software update app update upgrade new version software update install latest notification", body: () => `
      <p>You don't need to download Blockvile again. Updates install in place and keep your apps, files and settings.</p>
      <ul><li>You get an <b>Update available</b> notification when a new version is ready.</li>
        <li>Open the <b>Software Update</b> app (it's in your app list, and Settings has a shortcut) and tap <b>Update now</b>. Tap <b>Check for updates</b> any time — it's also right in <b>Settings → Software update</b>, or type <code>update</code> in the Terminal (then <code>update now</code> to install).</li>
        <li>Updates are <b>manual</b>: Blockvile shows an <b>Update available</b> card on your home screen, but nothing installs until you tap <b>Update now</b>.</li>
        <li>In the Android app, some updates change the app itself. Then the button says <b>Update on Google Play</b>.</li></ul>
      ${btnOpen("updates", "⬆️ Open Software Update")}` },
    { id: "install", icon: "📲", title: "Install Blockvile on your device", tags: "install download app home screen desktop pwa add icon offline iphone android windows mac chromebook", body: os => `
      <p>Install Blockvile and it gets its own icon, opens full screen and works offline — like any other app.</p>
      <p><b>On this device:</b> ${esc(os.installLabel())}</p>
      ${btnDo("install", "📲 Install on this device", true)}
      <h4>How it works on each device</h4>
      <ul><li><b>Android, Windows, Mac, Chromebook (Chrome or Edge):</b> tap <b>Install</b>, or use the browser menu → <i>Install app</i>.</li>
        <li><b>iPhone and iPad:</b> in Safari tap <b>Share</b> → <b>Add to Home Screen</b>.</li>
        <li><b>Android app:</b> the Blockvile app on Google Play is already installed — and you can let it temporarily take over the phone.</li></ul>
      <div class="tip">Install needs Blockvile to be opened from a website. If you opened it from a file, it still works offline — just keep the file.</div>` },
    { id: "look", icon: "◐", title: "Dark mode, wallpapers and colours", tags: "dark light theme wallpaper colour color accent night light brightness", body: () => `
      <ul><li><b>Dark mode:</b> the 🌙 button in the corner, the Control Centre, or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>. Settings can follow your device's theme automatically.</li>
        <li><b>Wallpaper:</b> Settings → Display &amp; wallpaper — pick one of four, or <b>Photo…</b> to use your own. In Gallery, open a photo and tap <b>Set wallpaper</b>.</li>
        <li><b>Accent colour:</b> seven colours in Settings.</li>
        <li><b>Night light</b> warms the screen in the evening; <b>brightness</b> is in the Control Centre.</li></ul>${btnOpen("settings", "⚙ Open Settings")}` },
    { id: "apps", icon: "🛍", title: "Getting and removing apps", tags: "store install uninstall get apps android google play web app pin dock", body: () => `
      <ul><li>Open the <b>Blockvile Store</b> to install extra apps and games with one tap.</li>
        <li><b>Android tab:</b> in the Android app, <b>Install</b> opens the app in Google Play; when you come back, Blockvile adds it to your home screen. In a browser, it opens the app's Play page.</li>
        <li><b>Library tab:</b> add any website as an app.</li>
        <li><b>Long-press</b> (or right-click) an icon to pin it to the dock or uninstall it.</li></ul>${btnOpen("store", "🛍 Open Blockvile Store")}` },
    { id: "videos", icon: "📺", title: "Watching YouTube", tags: "youtube video videos watch shorts playlist search api key not playing", body: () => `
      <ol><li>Open <b>Videos</b> and paste a YouTube link — videos, Shorts, live streams and playlists all work.</li>
        <li>Tap <b>♡ Save</b> to keep a video; your recent videos are in <b>History</b>.</li></ol>
      <h4>Searching</h4><p>Search opens YouTube in a new tab; copy a video's link and paste it into Videos. For search inside Blockvile, add a free YouTube Data API key in the Search tab.</p>
      <h4>Video won't play?</h4><ul><li>Some owners don't allow their videos on other sites — tap <b>↗ YouTube</b>.</li><li>Opened Blockvile from a file? Videos work best when Blockvile is on a website.</li></ul>${btnOpen("videos", "📺 Open Videos")}` },
    { id: "music", icon: "🎧", title: "Music and Cloud Music", tags: "music songs mp3 soundcloud cloud stream playlist audio", body: () => `
      <ul><li><b>Music</b> plays songs from your device: tap <b>Add music files</b>. They stay saved in Blockvile.</li>
        <li><b>Cloud Music</b> streams SoundCloud: paste a track, playlist or artist link, then save it to your library.</li></ul>${btnOpen("cloudmusic", "🎧 Open Cloud Music")}` },
    { id: "files", icon: "📁", title: "Files, notes and the Terminal", tags: "files folders documents notes editor terminal command line upload save", body: () => `
      <ul><li><b>Files</b> keeps folders and documents. Upload from your device with <b>⬆ Upload</b> — photos go to Gallery and songs to Music.</li>
        <li><b>Text Editor</b> opens text files; press <kbd>Ctrl</kbd>+<kbd>S</kbd> to save.</li>
        <li><b>Notes</b> saves automatically. Use <b>Save to Files</b> to keep a copy as a document.</li>
        <li><b>Terminal</b> has real commands: type <code>help</code> to see them all.</li></ul>${btnOpen("files", "📁 Open Files")}${btnOpen("terminal", "⌨ Open Terminal")}` },
    { id: "control", icon: "⚙️", title: "Control Centre, notifications and Do Not Disturb", tags: "control centre center notifications do not disturb dnd airplane torch battery saver volume", body: () => `
      <ul><li><b>Control Centre:</b> swipe down from the top-right, or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd>. It has Wi-Fi, brightness, volume, dark mode, Do Not Disturb, night light, battery saver, rotate, layouts and Exit.</li>
        <li><b>Notifications:</b> swipe down from the top-left. Tap one to open its app, or ✕ to dismiss it. App icons show a red badge for new ones.</li>
        <li><b>Do Not Disturb</b> silences banners and sounds; notifications still collect quietly.</li></ul>` },
    { id: "security", icon: "🔒", title: "Lock screen and PIN", tags: "lock pin password security auto lock forgot", body: () => `
      <ul><li>Set a 4–8 digit PIN in Settings → Lock screen &amp; security, and choose an <b>auto-lock</b> time.</li>
        <li>Lock any time with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> or the power menu.</li></ul>
      <div class="tip">The PIN guards the Blockvile screen from quick snooping. It isn't a replacement for your device's own lock.</div>` },
    { id: "keys", icon: "⌨", title: "Keyboard shortcuts", tags: "keyboard shortcuts keys hotkeys ctrl", body: os => `
      <div class="list">${os.shortcuts.map(([k, d]) => `<div><span>${esc(d)}</span><kbd>${esc(k)}</kbd></div>`).join("")}</div>` },
    { id: "privacy", icon: "🛡", title: "Privacy and your data", tags: "privacy data saved storage delete erase reset tracking ads account", body: () => `
      <ul><li>No account, no ads, no tracking. Your files, notes, photos and settings stay on <b>this device</b>.</li>
        <li>Weather, Maps, Videos, Cloud Music and the Browser connect to those services when you use them.</li>
        <li>Feedback is only sent when you press <b>Send</b>, and device details only if you tick the box.</li>
        <li>Erase everything in Settings → <b>Erase everything &amp; reset</b>.</li></ul>
      <p><a href="privacy.html" target="_blank" rel="noopener">Read the full privacy policy</a></p>` },
    { id: "trouble", icon: "🧰", title: "Troubleshooting", tags: "problem not working fix broken error help saved reset camera microphone install missing slow", body: () => `
      <h4>“Changes won't be saved”</h4><p>The page Blockvile is in doesn't allow storage (some embeds do this). Open Blockvile on its own to keep your changes.</p>
      <h4>No Install option</h4><p>It may already be installed, or the browser doesn't support it — try Chrome or Edge, or Safari's <b>Add to Home Screen</b> on iPhone. ${go("install", "Install help →")}</p>
      <h4>Camera or microphone not working</h4><p>Allow access when your browser asks. If Blockvile is inside another website, that site has to allow it too.</p>
      <h4>A website won't open in Browser</h4><p>Many big sites refuse to load inside apps. Use the <b>↗</b> button to open it normally.</p>
      <h4>Something's stuck</h4><p>Try <b>Restart</b> from the power menu (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>). As a last resort, Settings → <b>Erase everything &amp; reset</b>.</p>
      <h4>Still stuck?</h4>${btnDo("feedback-bug", "🐞 Report a problem", true)}` },
    { id: "contact", icon: "💬", title: "Send feedback or get in touch", tags: "feedback contact support bug report idea suggestion email", body: () => `
      <p>Found a bug, have an idea, or just like something? Tell us — it really helps.</p>
      ${btnDo("feedback", "💬 Send feedback", true)}${btnDo("feedback-bug", "🐞 Report a problem")}` },
  ];

  window.BV_APPS.push({
    id: "help", name: "Help", icon: "❓", bg: "linear-gradient(135deg,#38bdf8,#6366f1)", cat: "System", system: true, size: [640, 640],
    keywords: "help support guide faq how to tutorial manual",
    render(body, os, args) {
      let q = "", art = args?.article || null; const trail = [];
      const votes = () => store.get("helpVotes", {});
      const draw = () => {
        const a = ARTICLES.find(x => x.id === art);
        if (a) {
          const v = votes()[a.id];
          body.innerHTML = `<div class="hp-art"><button class="btn ghost" data-back>‹ ${trail.length ? "Back" : "All help"}</button>
            <h2>${a.icon} ${esc(a.title)}</h2>${a.body(os)}
            <div class="hp-vote"><span class="muted">Was this helpful?</span>
              <button class="btn ghost" data-vote="up" ${v === "up" ? 'style="outline:2px solid var(--accent)"' : ""}>👍 Yes</button>
              <button class="btn ghost" data-vote="down" ${v === "down" ? 'style="outline:2px solid var(--accent)"' : ""}>👎 No</button>
              ${v === "down" ? `<button class="btn" data-do="feedback-article">Tell us what was missing</button>` : v === "up" ? `<span class="muted">Thanks!</span>` : ""}</div></div>`;
          os.setTitle("help", "Help — " + a.title);
          return;
        }
        os.setTitle("help", "Help");
        const ql = q.toLowerCase().trim();
        const hits = ql ? ARTICLES.filter(x => (x.title + " " + x.tags).toLowerCase().includes(ql) || x.body(os).replace(/<[^>]+>/g, " ").toLowerCase().includes(ql)) : ARTICLES;
        body.innerHTML = `<input class="field hp-search" data-q placeholder="Search help — e.g. “exit”, “install”, “dark mode”" value="${esc(q)}" aria-label="Search help">
          ${ql ? "" : `<div class="hp-hero"><span>❓</span><div><b>How can we help?</b><small>Blockvile Plus ${esc(ver())} · ${esc(os.state.mode)} mode</small></div></div>
          <div class="hp-quick">
            <button data-goto="start"><span>👋</span>Getting started<small>The 1-minute tour</small></button>
            <button data-do="install"><span>📲</span>Install<small>${esc(os.installLabel())}</small></button>
            <button data-goto="exit"><span>⏏</span>Exit Blockvile<small>Back to your device</small></button>
            <button data-do="feedback"><span>💬</span>Send feedback<small>Bugs, ideas, praise</small></button>
          </div><div class="h">All topics</div>`}
          <div>${hits.map(x => `<button class="hp-row" data-goto="${x.id}"><span>${x.icon}</span><div><b>${esc(x.title)}</b></div></button>`).join("") || `<p class="muted center" style="padding:20px">No help topics match “${esc(q)}”.<br><br>${btnDo("feedback-question", "Ask a question")}</p>`}</div>`;
        const qi = body.querySelector("[data-q]"); qi.oninput = () => { q = qi.value; draw(); const n = body.querySelector("[data-q]"); n.focus(); n.setSelectionRange(q.length, q.length); };
      };
      body.addEventListener("click", e => {
        const g = e.target.closest("[data-goto]"); if (g) { if (art) trail.push(art); art = g.dataset.goto; draw(); body.scrollTop = 0; return; }
        if (e.target.closest("[data-back]")) { art = trail.pop() || null; draw(); return; }
        const o = e.target.closest("[data-open-app]"); if (o) return os.open(o.dataset.openApp);
        const v = e.target.closest("[data-vote]"); if (v) { const all = votes(); all[art] = v.dataset.vote; store.set("helpVotes", all); return draw(); }
        const d = e.target.closest("[data-do]")?.dataset.do; if (!d) return;
        const a = ARTICLES.find(x => x.id === art);
        if (d === "install") os.installApp();
        if (d === "feedback") os.open("feedback");
        if (d === "feedback-bug") os.open("feedback", { type: "bug" });
        if (d === "feedback-question") os.open("feedback", { type: "question", text: q ? `I was looking for help with: ${q}\n\n` : "" });
        if (d === "feedback-article" && a) os.open("feedback", { type: "question", text: `The help page “${a.title}” didn't answer my question.\n\nWhat I wanted to know: ` });
      });
      os.onBack("help", () => { if (art) { art = trail.pop() || null; draw(); return true; } if (q) { q = ""; draw(); return true; } });
      const onCh = () => { if (!body.contains(document.activeElement) || !/INPUT/.test(document.activeElement.tagName)) draw(); };
      window.addEventListener("bv:changed", onCh);
      draw();
      return () => window.removeEventListener("bv:changed", onCh);
    }
  });

  /* ================= Feedback ================= */
  const TYPES = { bug: ["🐞", "Problem"], idea: ["💡", "Idea"], praise: ["❤️", "Praise"], question: ["❓", "Question"] };
  const STATUS = { sent: "Sent", queued: "Will send when online", email: "Opened in email", saved: "Saved on this device" };

  function deviceInfo() {
    const os = window.BlockvileOS, ua = navigator.userAgent;
    const br = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Other";
    const plat = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "Other";
    const and = window.BV.android?.available ? window.BV.android.device() : null;
    return {
      version: ver(), mode: os?.state.mode, theme: document.documentElement.dataset.theme,
      platform: and ? `Android ${and.android} (${and.model})` : plat, browser: and ? "Blockvile Android app" : br,
      screen: `${screen.width}×${screen.height} @${devicePixelRatio || 1}x`, window: `${innerWidth}×${innerHeight}`,
      installed: os?.installLabel?.(), embedded: !!window.BV.embedded, language: navigator.language,
    };
  }
  const devText = d => Object.entries(d).map(([k, v]) => `${k}: ${v}`).join("\n");
  const asText = fb => [`Blockvile Plus feedback — ${TYPES[fb.type][1]}${fb.rating ? ` — ${"★".repeat(fb.rating)}${"☆".repeat(5 - fb.rating)}` : ""}`, "", fb.message,
    fb.contact ? `\nReply to: ${fb.contact}` : "", fb.device ? `\n— Device —\n${devText(fb.device)}` : ""].join("\n").trim();

  // Feedback goes out by every route that's set up, and counts as sent if ANY of them takes it:
  //  1) the form service in config.js (arrives in the publisher's inbox, no email app needed)
  //  2) the publisher's Supabase "feedback" table (also works for people who aren't signed in)
  async function viaForm(fb) {
    const url = CFG().feedback?.endpoint; if (!url) return false;
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type: TYPES[fb.type][1], rating: fb.rating || "", message: fb.message, email: fb.contact || "", device: fb.device ? devText(fb.device) : "", app: "Blockvile Plus " + ver(),
          _subject: `Blockvile feedback: ${TYPES[fb.type][1]}`, _template: "table", _captcha: "false", ...(fb.contact ? { _replyto: fb.contact } : {}) }) });
      if (!r.ok) return false;
      try { const j = await r.json(); if (j && (j.success === false || j.success === "false")) return false; } catch { }
      return true;
    } catch { return false; }
  }
  async function viaSupabase(fb) {
    const A = window.BV.auth; if (!A?.configured?.()) return false;
    try {
      const c = await A.client();
      const { error } = await c.from("feedback").insert({ type: TYPES[fb.type][1], rating: fb.rating || null, message: fb.message.slice(0, 4000), contact: (fb.contact || "").slice(0, 200) || null,
        device: fb.device ? devText(fb.device).slice(0, 1500) : null, app_version: ver() });
      return !error;
    } catch { return false; }
  }
  async function postFeedback(fb) {
    if (!CFG().feedback?.endpoint && !window.BV.auth?.configured?.()) return false;
    const [a, b] = await Promise.all([viaForm(fb), viaSupabase(fb)]);
    return a || b;
  }
  function openEmail(fb) {
    const to = CFG().feedback?.email; if (!to) return false;
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(`Blockvile Plus feedback: ${TYPES[fb.type][1]}`)}&body=${encodeURIComponent(asText(fb))}`;
    if (window.BV.android?.available) { window.open(href); return true; }
    try { const a = document.createElement("a"); a.href = href; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); return true; } catch { return false; }
  }
  const history = () => store.get("feedbackSent", []);
  const saveHistory = h => store.set("feedbackSent", h.slice(0, 30));
  async function flushQueue() { // retry feedback that couldn't be sent while offline
    const h = history(); let changed = false;
    for (const fb of h.filter(x => x.status === "queued")) if (await postFeedback(fb)) { fb.status = "sent"; changed = true; }
    if (changed) { saveHistory(h); window.BlockvileOS?.toast("💬 Your saved feedback was sent — thank you!"); window.dispatchEvent(new Event("bv:feedback")); }
  }
  window.addEventListener("online", flushQueue);
  setTimeout(() => { if (navigator.onLine) flushQueue(); }, 6000);

  window.BV_APPS.push({
    id: "feedback", name: "Feedback", icon: "💬", bg: "linear-gradient(135deg,#f59e0b,#ef4444)", cat: "System", system: true, size: [560, 680],
    keywords: "feedback bug report idea suggestion contact support rate review",
    render(body, os, args) {
      let view = "form", type = args?.type || "idea", rating = 0, last = null, includeDev = true;
      let draft = store.get("feedbackDraft", { message: "", contact: "" });
      if (args?.text) draft.message = args.text + (draft.message && !draft.message.startsWith(args.text) ? "" : "");
      const configured = () => !!(CFG().feedback?.endpoint || CFG().feedback?.email || window.BV.auth?.configured?.());
      const draw = () => {
        if (view === "done") {
          const s = last.status;
          body.innerHTML = `<div class="fb-done"><div>${s === "saved" ? "📝" : "💚"}</div>
            <h3>${s === "sent" ? "Thanks — your feedback was sent!" : s === "queued" ? "Saved — it'll send when you're back online" : s === "email" ? "Your email app should open now" : "Thanks! Your feedback is saved"}</h3>
            <p class="muted" style="margin:8px 0 16px">${s === "email" ? "Press Send in your email app to deliver it. Didn't open? Copy it instead." : s === "saved" ? "This copy of Blockvile isn't set up to send feedback yet. You can copy it or save it as a file to share." : "We read every message."}</p>
            <div class="row" style="justify-content:center;flex-wrap:wrap">${s === "email" || s === "saved" ? `<button class="btn" data-copy>📋 Copy feedback</button><button class="btn ghost" data-file>💾 Save as file</button>` : ""}
            <button class="btn ghost" data-new>Send more</button><button class="btn ghost" data-hist>History</button></div></div>`;
          return;
        }
        if (view === "history") {
          const h = history();
          body.innerHTML = `<button class="btn ghost" data-form>‹ New feedback</button><div class="h" style="margin-top:14px">Your feedback</div>
            ${h.length ? h.map(f => `<div class="fb-hist"><span>${TYPES[f.type][0]}</span><div><b>${esc(f.message.split("\n")[0] || "(no text)")}</b><small>${new Date(f.time).toLocaleString()}</small></div><span class="fb-tag ${f.status}">${STATUS[f.status]}</span></div>`).join("")
              : `<p class="muted center" style="padding:20px">Nothing sent yet.</p>`}
            ${h.some(f => f.status === "queued") ? `<button class="btn" data-retry>Try sending again</button>` : ""}`;
          return;
        }
        const dev = deviceInfo();
        body.innerHTML = `<form class="fb-form" data-fbform>
          <div class="fb-types">${Object.entries(TYPES).map(([k, [ic, l]]) => `<button type="button" data-type="${k}" class="${type === k ? "on" : ""}"><span>${ic}</span>${l}</button>`).join("")}</div>
          <label>How are you finding Blockvile?</label>
          <div class="fb-stars" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}" class="${n <= rating ? "on" : ""}" aria-label="${n} star${n > 1 ? "s" : ""}">⭐</button>`).join("")}</div>
          <label for="fb-msg">${{ bug: "What went wrong? What did you expect to happen?", idea: "What would make Blockvile better?", praise: "What do you like?", question: "What's your question?" }[type]}</label>
          <textarea id="fb-msg" class="field" data-msg maxlength="5000" placeholder="${{ bug: "e.g. When I open Videos in tablet mode, the player…", idea: "e.g. It would be great if…", praise: "e.g. I love the laptop mode because…", question: "Ask anything…" }[type]}">${esc(draft.message)}</textarea>
          <label for="fb-contact">Email for a reply (optional)</label>
          <input id="fb-contact" class="field" data-contact type="email" placeholder="you@example.com" value="${esc(draft.contact)}" autocomplete="email">
          <label class="fb-check"><input type="checkbox" data-dev ${includeDev ? "checked" : ""}><span>Include device details — helps fix problems. <button type="button" class="link-btn" data-showdev>See what's included</button>
            <div class="fb-dev" data-devbox hidden>${esc(devText(dev))}</div></span></label>
          <div class="row" style="justify-content:space-between;flex-wrap:wrap"><button type="button" class="btn ghost" data-hist>History (${history().length})</button><button class="btn" data-send>Send feedback</button></div>
          ${configured() ? "" : `<p class="muted" style="font-size:11px;margin-top:10px">Feedback delivery isn't set up in this copy yet, so it's saved here and you can copy or share it. (Publisher: set it in js/config.js.)</p>`}
        </form>`;
      };
      const keepDraft = () => {
        const m = body.querySelector("[data-msg]"), c = body.querySelector("[data-contact]");
        if (m) draft = { message: m.value, contact: c.value }; store.set("feedbackDraft", draft);
      };
      body.addEventListener("input", keepDraft);
      body.addEventListener("change", e => { if (e.target.matches("[data-dev]")) includeDev = e.target.checked; });
      body.addEventListener("click", async e => {
        const t = e.target.closest("[data-type]"); if (t) { keepDraft(); type = t.dataset.type; return draw(); }
        const st = e.target.closest("[data-star]"); if (st) { keepDraft(); rating = +st.dataset.star; return draw(); }
        if (e.target.closest("[data-showdev]")) { const b = body.querySelector("[data-devbox]"); b.hidden = !b.hidden; return; }
        if (e.target.closest("[data-hist]")) { view = "history"; return draw(); }
        if (e.target.closest("[data-form]") || e.target.closest("[data-new]")) { view = "form"; rating = 0; return draw(); }
        if (e.target.closest("[data-retry]")) { await flushQueue(); return draw(); }
        if (e.target.closest("[data-copy]") && last) { try { await navigator.clipboard.writeText(asText(last)); os.toast("📋 Copied"); } catch { os.toast("Couldn't copy — use Save as file"); } return; }
        if (e.target.closest("[data-file]") && last) return window.BV.download(new Blob([asText(last)], { type: "text/plain" }), `blockvile-feedback-${new Date().toISOString().slice(0, 10)}.txt`);
      });
      body.addEventListener("submit", async e => {
        e.preventDefault(); keepDraft();
        const message = draft.message.trim();
        if (message.length < 3) { os.toast("Please write a few words first"); body.querySelector("[data-msg]")?.focus(); return; }
        const contact = draft.contact.trim();
        if (contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) { os.toast("That email address doesn't look right"); return; }
        const fb = { id: uid(), time: Date.now(), type, rating, message, contact, device: includeDev ? deviceInfo() : null, status: "saved" };
        const btn = body.querySelector("[data-send]"); if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
        if (CFG().feedback?.endpoint || window.BV.auth?.configured?.()) fb.status = navigator.onLine === false ? "queued" : (await postFeedback(fb)) ? "sent" : (CFG().feedback?.email && openEmail(fb) ? "email" : "queued");
        else if (openEmail(fb)) fb.status = "email";
        saveHistory([fb, ...history()]);
        draft = { message: "", contact }; store.set("feedbackDraft", draft);
        last = fb; view = "done"; draw();
      });
      const onFb = () => view === "history" && draw();
      window.addEventListener("bv:feedback", onFb);
      os.onBack("feedback", () => { if (view !== "form") { view = "form"; draw(); return true; } });
      draw();
      return () => window.removeEventListener("bv:feedback", onFb);
    }
  });
})();

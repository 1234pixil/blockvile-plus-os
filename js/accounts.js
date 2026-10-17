/* Blockvile Plus OS — accounts: sign in with Google, Microsoft or any email (Supabase), link this device,
   and open / read your Google and Microsoft services. Powers BV.auth, used by the Digital SIM and Blockvile AI. */
(() => {
  const { esc, store } = window.BV;
  const CFG = () => window.BV_CONFIG || {};
  const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
  const isAndroid = () => !!window.BV.android?.available;

  /* ---------- tiny helpers ---------- */
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch { } } };
  const emit = () => window.dispatchEvent(new Event("bv:auth"));

  /* ---------- Supabase settings: the publisher's config.js wins; otherwise what the user pasted in Accounts → Setup ---------- */
  const settings = () => {
    const c = CFG().supabase || {}, mine = store.get("supabaseCfg", {});
    return { url: (c.url || mine.url || "").trim().replace(/\/+$/, ""), key: (c.anonKey || mine.anonKey || "").trim(), fn: c.aiFunction || "ai", fromConfig: !!(c.url && c.anonKey) };
  };
  const validUrl = u => /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(u);
  const configured = () => { const s = settings(); return validUrl(s.url) && s.key.length > 20 && !/service_role/i.test(s.key); };

  /* ---------- load the Supabase library only when it's needed ---------- */
  let libPromise = null, sb = null;
  const loadLib = () => libPromise || (libPromise = new Promise((res, rej) => {
    if (window.supabase?.createClient) return res();
    const el = document.createElement("script"); el.src = LIB; el.async = true;
    el.onload = () => (window.supabase?.createClient ? res() : rej(new Error("Sign-in library didn't start")));
    el.onerror = () => { libPromise = null; rej(new Error("Couldn't load the sign-in library — check your internet connection")); };
    document.head.appendChild(el);
  }));
  const storage = { getItem: k => store.get("sb:" + k, null), setItem: (k, v) => store.set("sb:" + k, v), removeItem: k => store.set("sb:" + k, null) };
  async function client() {
    if (!configured()) throw new Error("Sign-in isn't set up yet — open Accounts → Setup");
    if (sb) return sb;
    await loadLib();
    const s = settings();
    sb = window.supabase.createClient(s.url, s.key, { auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" } });
    sb.auth.onAuthStateChange((ev, session) => {
      if (session?.provider_token) { ss.set("bv:ptoken", session.provider_token); ss.set("bv:pprovider", session.user?.app_metadata?.provider || ""); }
      if (ev === "PASSWORD_RECOVERY") { auth.recovering = true; window.BlockvileOS?.open("accounts"); }
      auth.user = session?.user || null; auth.session = session || null; syncApps(); emit();
    });
    return sb;
  }

  /* ---------- the public auth object ---------- */
  const redirectTo = () => isAndroid() ? "blockvile://auth" : location.origin + location.pathname;
  const canRedirect = () => isAndroid() || /^https?:$/.test(location.protocol);
  const auth = {
    user: null, session: null, recovering: false,
    configured, settings,
    signedIn: () => !!auth.user,
    email: () => auth.user?.email || "",
    name: () => auth.user?.user_metadata?.full_name || auth.user?.user_metadata?.name || (auth.user?.email || "").split("@")[0],
    provider: () => auth.user?.app_metadata?.provider || "email",
    providerToken: () => ss.get("bv:ptoken"),
    providerOfToken: () => ss.get("bv:pprovider"),
    client,
    async init() {
      if (!configured()) return;
      const c = await client();
      const { data } = await c.auth.getSession();
      auth.user = data.session?.user || null; auth.session = data.session || null; syncApps(); emit();
      // Returning from Google / Microsoft in a normal browser
      const u = new URL(location.href);
      if (u.searchParams.get("code") && !isAndroid()) await auth.deepLink(location.href, true);
      const pending = window.__bvDeep || window.BV.android?.pendingDeepLink?.();
      if (pending) await auth.deepLink(pending);
    },
    // Called when Google/Microsoft sends the user back (browser address, or blockvile://auth on Android)
    async deepLink(url, clean) {
      try {
        const c = await client(), u = new URL(url), code = u.searchParams.get("code");
        const err = u.searchParams.get("error_description") || u.searchParams.get("error");
        if (err) throw new Error(err);
        if (code) { const { error } = await c.auth.exchangeCodeForSession(code); if (error) throw error; window.BlockvileOS?.toast("✅ Signed in"); }
      } catch (e) { window.BlockvileOS?.toast("⚠️ " + (e.message || "Sign-in didn't finish")); }
      finally { window.__bvDeep = null; if (clean) try { history.replaceState(null, "", location.pathname); } catch { } }
    },
    async signUp(email, password, name) {
      const c = await client();
      const { data, error } = await c.auth.signUp({ email, password, options: { data: { full_name: name || "" }, emailRedirectTo: redirectTo() } });
      if (error) throw error;
      return { needsConfirm: !data.session };
    },
    async newPassword(password) { const c = await client(); const { error } = await c.auth.updateUser({ password }); if (error) throw error; auth.recovering = false; },
    async signIn(email, password) { const c = await client(); const { error } = await c.auth.signInWithPassword({ email, password }); if (error) throw error; },
    async reset(email) { const c = await client(); const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() }); if (error) throw error; },
    // provider: "google" | "azure". "extra" asks for permission to read mail, calendar and files too.
    async oauth(provider, extra) {
      if (!canRedirect()) throw new Error("Google and Microsoft sign-in need the hosted website or the Android app (not a file opened from your computer)");
      const c = await client(), p = SERVICES[provider === "azure" ? "microsoft" : "google"];
      const { data, error } = await c.auth.signInWithOAuth({
        provider, options: {
          redirectTo: redirectTo(), skipBrowserRedirect: true,
          scopes: extra ? p.scopes.join(" ") : p.basic.join(" "),
          queryParams: provider === "google" ? { access_type: "offline", prompt: "consent" } : { prompt: "select_account" },
        }
      });
      if (error) throw error;
      // Google refuses to load inside a frame or an app's built-in browser, so it always opens on its own
      if (isAndroid() || BV.embedded) window.open(data.url, "_blank", "noopener"); else location.assign(data.url);
    },
    async signOut() {
      try { const c = await client(); await c.auth.signOut(); } catch { }
      auth.user = null; auth.session = null; ss.set("bv:ptoken", null); ss.set("bv:pprovider", null); syncApps(); emit();
    },
  };

  /* ---------- Google & Microsoft services ---------- */
  const SERVICES = {
    google: {
      name: "Google", icon: "🟦", provider: "google",
      basic: ["openid", "email", "profile"],
      scopes: ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/drive.readonly"],
      apps: [
        ["📧", "Gmail", "com.google.android.gm", "https://mail.google.com/"], ["📁", "Drive", "com.google.android.apps.docs", "https://drive.google.com/"],
        ["📄", "Docs", "com.google.android.apps.docs.editors.docs", "https://docs.google.com/document/"], ["📊", "Sheets", "com.google.android.apps.docs.editors.sheets", "https://docs.google.com/spreadsheets/"],
        ["📽", "Slides", "com.google.android.apps.docs.editors.slides", "https://docs.google.com/presentation/"], ["📅", "Calendar", "com.google.android.calendar", "https://calendar.google.com/"],
        ["🎥", "Meet", "com.google.android.apps.tachyon", "https://meet.google.com/"], ["🖼", "Photos", "com.google.android.apps.photos", "https://photos.google.com/"],
        ["🗺", "Maps", "com.google.android.apps.maps", "https://maps.google.com/"], ["▶️", "YouTube", "com.google.android.youtube", "https://www.youtube.com/"],
        ["👥", "Contacts", "com.google.android.contacts", "https://contacts.google.com/"], ["🗒", "Keep", "com.google.android.keep", "https://keep.google.com/"],
        ["🌐", "Translate", "com.google.android.apps.translate", "https://translate.google.com/"], ["👤", "My Account", "", "https://myaccount.google.com/"],
      ],
    },
    microsoft: {
      name: "Microsoft", icon: "🟧", provider: "azure",
      basic: ["openid", "email", "profile", "offline_access"],
      scopes: ["openid", "email", "profile", "offline_access", "User.Read", "Mail.Read", "Calendars.Read", "Files.Read"],
      apps: [
        ["📧", "Outlook", "com.microsoft.office.outlook", "https://outlook.live.com/mail/"], ["☁️", "OneDrive", "com.microsoft.skydrive", "https://onedrive.live.com/"],
        ["📄", "Word", "com.microsoft.office.word", "https://www.office.com/launch/word"], ["📊", "Excel", "com.microsoft.office.excel", "https://www.office.com/launch/excel"],
        ["📽", "PowerPoint", "com.microsoft.office.powerpoint", "https://www.office.com/launch/powerpoint"], ["💬", "Teams", "com.microsoft.teams", "https://teams.microsoft.com/"],
        ["📓", "OneNote", "com.microsoft.office.onenote", "https://www.onenote.com/notebooks"], ["✅", "To Do", "com.microsoft.todos", "https://to-do.live.com/"],
        ["📅", "Calendar", "com.microsoft.office.outlook", "https://outlook.live.com/calendar/"], ["👥", "People", "", "https://outlook.live.com/people/"],
        ["🧩", "Microsoft 365", "com.microsoft.office.officehubrow", "https://www.office.com/"], ["👤", "My Account", "", "https://account.microsoft.com/"],
      ],
    },
  };
  // Opens the real app on Android if it's installed, otherwise the website
  function openService(pkg, url) {
    const a = window.BV.android;
    if (a?.available && pkg && a.installed(pkg)) return a.launch(pkg);
    window.open(url, "_blank", "noopener");
  }
  // What we can read once the user has allowed it (token lives for this visit only and is never saved)
  async function get(url, token) {
    const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    if (r.status === 401 || r.status === 403) throw new Error("denied");
    if (!r.ok) throw new Error("failed");
    return r.json();
  }
  const DATA = {
    google: async t => {
      const [mail, cal, drv] = await Promise.allSettled([
        get("https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX", t),
        get("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=4&singleEvents=true&orderBy=startTime&timeMin=" + encodeURIComponent(new Date().toISOString()), t),
        get("https://www.googleapis.com/drive/v3/files?pageSize=4&orderBy=modifiedTime%20desc&fields=files(id,name,webViewLink)", t)]);
      const v = x => x.status === "fulfilled" ? x.value : null;
      return {
        unread: v(mail)?.messagesUnread ?? null,
        events: (v(cal)?.items || []).map(e => ({ title: e.summary || "(no title)", when: e.start?.dateTime || e.start?.date, url: e.htmlLink })),
        files: (v(drv)?.files || []).map(f => ({ title: f.name, url: f.webViewLink })),
        denied: [mail, cal, drv].every(x => x.status === "rejected"),
      };
    },
    microsoft: async t => {
      const now = new Date(), end = new Date(now.getTime() + 7 * 864e5);
      const [mail, cal, drv] = await Promise.allSettled([
        get("https://graph.microsoft.com/v1.0/me/mailFolders/inbox?$select=unreadItemCount", t),
        get(`https://graph.microsoft.com/v1.0/me/calendarview?startdatetime=${now.toISOString()}&enddatetime=${end.toISOString()}&$top=4&$orderby=start/dateTime&$select=subject,start,webLink`, t),
        get("https://graph.microsoft.com/v1.0/me/drive/recent?$top=4", t)]);
      const v = x => x.status === "fulfilled" ? x.value : null;
      return {
        unread: v(mail)?.unreadItemCount ?? null,
        events: (v(cal)?.value || []).map(e => ({ title: e.subject || "(no title)", when: e.start?.dateTime ? e.start.dateTime + "Z" : "", url: e.webLink })),
        files: (v(drv)?.value || []).map(f => ({ title: f.name, url: f.webUrl })),
        denied: [mail, cal, drv].every(x => x.status === "rejected"),
      };
    },
  };

  /* ---------- link this device to the account ---------- */
  const deviceKey = () => { let k = store.get("deviceKey", ""); if (!k) { k = (crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)); store.set("deviceKey", k); } return k; };
  const deviceName = () => {
    const d = window.BV.android?.device?.() || {};
    if (d.model) return d.model;
    const ua = navigator.userAgent;
    const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "Mac" : /CrOS/.test(ua) ? "Chromebook" : /Linux/.test(ua) ? "Linux" : "device";
    const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "browser";
    return `${os} · ${br}`;
  };
  const devices = {
    async list() { const c = await client(); const { data, error } = await c.from("devices").select("*").order("last_seen", { ascending: false }); if (error) throw error; return data; },
    async link() {
      const c = await client();
      const { error } = await c.from("devices").upsert({ user_id: auth.user.id, device_key: deviceKey(), name: deviceName(), platform: isAndroid() ? "android" : "web", last_seen: new Date().toISOString() }, { onConflict: "user_id,device_key" });
      if (error) throw error; store.set("deviceLinked:" + auth.user.id, true);
    },
    async unlink(id) { const c = await client(); const { error } = await c.from("devices").delete().eq("id", id); if (error) throw error; },
    isThis: d => d.device_key === deviceKey(),
    isLinked: () => !!(auth.user && store.get("deviceLinked:" + auth.user.id, false)),
    async touch() { if (devices.isLinked()) try { await devices.link(); } catch { } },
  };

  /* ---------- the Digital SIM only exists while signed in ---------- */
  function syncApps() {
    const os = window.BlockvileOS; if (!os?.registerApp) return;
    const has = !!os.apps().find(a => a.id === "sim");
    if (auth.user && !has) os.registerApp(SIM_APP());
    if (!auth.user && has) os.unregisterApp("sim");
  }

  window.BV.auth = auth; window.BV.services = { SERVICES, openService, DATA, devices, deviceName };
  window.BV.accountsInternals = { SIM_APP: null };
  const SIM_APP = () => window.BV.simApp;

  /* ================= Accounts app ================= */
  window.BV_APPS.push({
    id: "accounts", name: "Accounts", icon: "👤", bg: "linear-gradient(135deg,#6366f1,#22d3ee)", cat: "System", system: true, size: [520, 600],
    keywords: "account sign in login google microsoft email supabase link device gmail outlook onedrive drive services",
    render(body, os, args) {
      let draft = null, tab = args?.tab || "in", busy = false, note = "", devs = null, svcData = {}, setup = false;
      const flash = (m, bad) => { note = (bad ? "⚠️ " : "") + m; draw(); };
      const btn = (act, label, cls = "") => `<button class="btn ${cls}" data-do="${act}" ${busy ? "disabled" : ""}>${label}</button>`;
      const err = e => /Invalid login/i.test(e?.message) ? "Wrong email or password" : (e?.message || String(e));

      const setupBox = () => `<details class="ac-setup" ${setup || !auth.configured() ? "open" : ""}><summary><b>Setup</b> — connect your Supabase project</summary>
        <p class="muted" style="font-size:13px">Make a free project at supabase.com, run <code>supabase/schema.sql</code> in its SQL Editor, then paste the two values from <b>Project Settings → API</b>. Use the <b>anon / publishable</b> key — never the service_role key.</p>
        ${auth.settings().fromConfig ? `<p class="muted">✅ Set by the publisher of this copy of Blockvile.</p>` : `
          <input class="field" data-su placeholder="Project URL  https://xxxx.supabase.co" value="${esc(draft ? draft.url : auth.settings().url)}" style="margin-bottom:8px">
          <input class="field" data-sk placeholder="anon / publishable key" value="${esc(draft ? draft.key : auth.settings().key)}" style="margin-bottom:8px">
          ${btn("savecfg", "Save")}`}
        <p class="muted" style="font-size:12px;margin-top:10px">For Google/Microsoft sign-in, turn the providers on in Supabase → Authentication → Providers, and add <code>${esc(redirectTo())}</code> to Redirect URLs.</p></details>`;

      const signedOut = () => `
        <div class="seg"><button data-tab="in" class="${tab === "in" ? "on" : ""}">Sign in</button><button data-tab="up" class="${tab === "up" ? "on" : ""}">Create account</button></div>
        <div class="ac-oauth">
          <button class="btn ghost ac-g" data-do="google" ${busy ? "disabled" : ""}><b style="color:#4285f4">G</b> Continue with Google</button>
          <button class="btn ghost ac-m" data-do="azure" ${busy ? "disabled" : ""}><b style="color:#f25022">▪</b> Continue with Microsoft</button>
        </div>
        <p class="muted" style="text-align:center;margin:14px 0">or use any email address</p>
        <form data-form>
          ${tab === "up" ? `<input class="field" name="name" placeholder="Your name" autocomplete="name" style="margin-bottom:8px">` : ""}
          <input class="field" name="email" type="email" placeholder="Email (Gmail, Outlook, your own…)" autocomplete="email" required style="margin-bottom:8px">
          <input class="field" name="password" type="password" placeholder="Password${tab === "up" ? " (at least 8 characters)" : ""}" autocomplete="${tab === "up" ? "new-password" : "current-password"}" minlength="${tab === "up" ? 8 : 1}" required style="margin-bottom:12px">
          <button class="btn" style="width:100%" ${busy ? "disabled" : ""}>${tab === "up" ? "Create account" : "Sign in"}</button>
          ${tab === "in" ? `<button type="button" class="link-btn" data-do="forgot" style="margin-top:10px">Forgot password?</button>` : ""}
        </form>
        <p class="muted" style="font-size:12px;margin-top:12px">Signing in unlocks your <b>Digital SIM</b> and cloud features. Without an account, everything else in Blockvile still works.</p>`;

      const svcCard = key => {
        const S = SERVICES[key], linked = auth.providerOfToken() === S.provider && auth.providerToken(), d = svcData[key];
        const when = t => { const x = new Date(t); return isNaN(x) ? "" : x.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" }); };
        return `<div class="ac-svc"><h4>${S.icon} ${S.name} services</h4>
          <div class="ac-tiles">${S.apps.map(([ic, n, pkg, url]) => `<button class="ac-tile" data-svc="${key}" data-n="${esc(n)}"><span>${ic}</span>${esc(n)}</button>`).join("")}</div>
          ${linked ? (d ? (d.denied ? `<p class="muted">Couldn't read your ${S.name} data. Link again to allow it.</p>` : `
            <div class="list" style="margin-top:10px">
              <div><span>📧 Unread mail</span><b>${d.unread ?? "–"}</b></div>
              ${d.events.map(e => `<div data-url="${esc(e.url || "")}"><span>📅 ${esc(e.title)}</span><small>${esc(when(e.when))}</small></div>`).join("") || `<div><span class="muted">No upcoming events</span></div>`}
              ${d.files.map(f => `<div data-url="${esc(f.url || "")}"><span>📄 ${esc(f.title)}</span><small>open</small></div>`).join("")}
            </div>`) : `<p class="muted">Loading…</p>`)
            : `<button class="btn ghost" data-do="link-${S.provider}" style="margin-top:10px;width:100%" ${busy ? "disabled" : ""}>🔗 Link ${S.name} mail, calendar &amp; files</button>
               <p class="muted" style="font-size:12px;margin:6px 0 0">You choose what to allow on ${S.name}'s own page. Blockvile only reads, never sends or deletes, and doesn't keep the access after you close it.</p>`}</div>`;
      };

      const recovery = () => `<p><b>Choose a new password</b></p><form data-newpw><input class="field" name="pw" type="password" minlength="8" placeholder="New password (at least 8 characters)" autocomplete="new-password" required style="margin-bottom:12px"><button class="btn" style="width:100%">Save new password</button></form>`;
      const signedIn = () => `
        <div class="ac-me"><div class="ac-av">${esc((auth.name() || "?")[0].toUpperCase())}</div>
          <div style="flex:1;min-width:0"><b>${esc(auth.name())}</b><br><small class="muted">${esc(auth.email())} · ${esc(auth.provider() === "azure" ? "Microsoft" : auth.provider())}</small></div>
          ${btn("signout", "Sign out", "ghost")}</div>
        <div class="list" style="margin-top:14px">
          <button data-do="opensim"><span><b>📶 Digital SIM</b><br><small>Your Blockvile number — charges on Wi-Fi</small></span><small>›</small></button>
          <button data-do="openai"><span><b>✨ Blockvile AI</b><br><small>Ask anything or tell your device what to do</small></span><small>›</small></button>
        </div>
        <div class="ac-svc"><h4>📱 This device</h4>
          ${devs == null ? `<p class="muted">Loading…</p>` : `<div class="list">${devs.map(d => `<div><span>${d.platform === "android" ? "📱" : "💻"} ${esc(d.name)}${devices.isThis(d) ? ` <small>(this device)</small>` : ""}<br><small>Last seen ${new Date(d.last_seen).toLocaleDateString()}</small></span>${devices.isThis(d) ? "" : `<button class="btn ghost" style="padding:6px 10px" data-unlink="${d.id}">Unlink</button>`}</div>`).join("") || `<div><span class="muted">No linked devices yet</span></div>`}</div>`}
          ${devs && !devs.some(devices.isThis) ? btn("linkdev", "🔗 Link this device to my account") : `<p class="muted" style="font-size:12px">Linked devices share your account and SIM. Unlink any time.</p>`}
        </div>
        ${svcCard("google")}${svcCard("microsoft")}`;

      const draw = () => {
        body.innerHTML = `<div class="ac">${note ? `<div class="tip" style="margin-bottom:12px">${esc(note)}</div>` : ""}
          ${auth.user && auth.recovering ? recovery() : auth.user ? signedIn() : auth.configured() ? signedOut() : `<p>Sign in to unlock your <b>Digital SIM</b> and cloud features.</p>`}
          ${setupBox()}</div>`;
      };
      const load = async () => {
        if (!auth.user) return;
        try { devs = await devices.list(); await devices.touch(); } catch (e) { devs = []; note = "⚠️ Run supabase/schema.sql in your Supabase project (devices table missing)"; }
        draw();
        for (const k of ["google", "microsoft"]) {
          const t = auth.providerToken();
          if (t && auth.providerOfToken() === SERVICES[k].provider && !svcData[k]) { DATA[k](t).then(d => { svcData[k] = d; draw(); }).catch(() => { svcData[k] = { denied: true }; draw(); }); }
        }
      };
      const run = async fn => { busy = true; note = ""; draw(); try { await fn(); } catch (e) { note = "⚠️ " + err(e); } busy = false; draw(); };

      body.addEventListener("click", e => {
        const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; note = ""; return draw(); }
        const svc = e.target.closest("[data-svc]");
        if (svc) { const row = SERVICES[svc.dataset.svc].apps.find(a => a[1] === svc.dataset.n); return openService(row[2], row[3]); }
        const u = e.target.closest("[data-url]"); if (u && u.dataset.url) return window.open(u.dataset.url, "_blank", "noopener");
        const ul = e.target.closest("[data-unlink]"); if (ul) return run(async () => { await devices.unlink(ul.dataset.unlink); devs = await devices.list(); });
        const b = e.target.closest("[data-do]"); if (!b) return;
        const act = b.dataset.do;
        if (act === "savecfg") {
          const url = body.querySelector("[data-su]").value.trim().replace(/\/+$/, ""), key = body.querySelector("[data-sk]").value.trim();
          draft = { url, key };
          if (!validUrl(url)) return flash("That doesn't look like a Supabase project URL (https://xxxx.supabase.co)", true);
          if (/service_role/i.test(key) || key.length < 20) return flash("Use the anon / publishable key (not the service_role key)", true);
          store.set("supabaseCfg", { url, anonKey: key }); sb = null; setup = false; draft = null;
          return run(async () => { await auth.init(); note = "✅ Saved"; });
        }
        if (act === "google" || act === "azure") return run(() => auth.oauth(act, false));
        if (act === "link-google" || act === "link-azure") return run(() => auth.oauth(act.slice(5), true));
        if (act === "signout") return run(async () => { await auth.signOut(); devs = null; svcData = {}; });
        if (act === "forgot") { const em = body.querySelector("[name=email]")?.value.trim(); if (!em) return flash("Type your email first", true); return run(async () => { await auth.reset(em); note = "📧 If that email has an account, a reset link is on its way"; }); }
        if (act === "linkdev") return run(async () => { await devices.link(); devs = await devices.list(); note = "✅ This device is linked"; });
        if (act === "opensim") return os.open("sim");
        if (act === "openai") return os.open("ai");
      });
      body.addEventListener("submit", e => {
        const np = e.target.closest("[data-newpw]");
        if (np) { e.preventDefault(); return run(async () => { await auth.newPassword(np.pw.value); note = "✅ Password changed"; }); }
        const f = e.target.closest("[data-form]"); if (!f) return; e.preventDefault();
        const em = f.email.value.trim(), pw = f.password.value;
        run(async () => {
          if (tab === "up") { const r = await auth.signUp(em, pw, f.name?.value.trim()); note = r.needsConfirm ? "📧 Almost done — open the email we sent to confirm your address, then sign in" : "✅ Account created"; if (r.needsConfirm) tab = "in"; }
          else await auth.signIn(em, pw);
        });
      });
      const onAuth = () => { if (!body.isConnected) return window.removeEventListener("bv:auth", onAuth); devs = null; svcData = {}; draw(); load(); };
      window.addEventListener("bv:auth", onAuth);
      draw(); load();
    }
  });

  /* start once the page is ready (os.js runs after this file) */
  window.addEventListener("load", () => setTimeout(() => { syncApps(); auth.init().catch(() => { }); }, 300));
})();

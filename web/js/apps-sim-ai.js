/* Blockvile Plus OS — Digital SIM (signed-in users only) and Blockvile AI */
(() => {
  const { esc, store } = window.BV;
  const A = () => window.BV.auth;

  /* ---------- Wi-Fi detection (the Digital SIM only charges on Wi-Fi) ---------- */
  function onWifi() {
    const a = window.BV.android;
    if (a?.available) return !!a.onWifi();
    if (!navigator.onLine) return false;
    const c = navigator.connection;
    if (c?.type) return c.type === "wifi" || c.type === "ethernet";
    return !/cellular|slow-2g|2g|3g/.test(c?.effectiveType || "") ;
  }

  /* ================= Digital SIM ================= */
  window.BV.simApp = {
    id: "sim", name: "Digital SIM", icon: "📶", bg: "linear-gradient(135deg,#0ea5e9,#22c55e)", cat: "System", size: [440, 620],
    keywords: "sim digital number messages sms text charge wifi blockvile number esim",
    render(body, os) {
      const auth = A();
      if (!auth.signedIn()) {
        body.innerHTML = `<div class="sim"><div class="sim-lock"><div style="font-size:54px">🔒</div><h3>Sign in to use your Digital SIM</h3><p class="muted">The Digital SIM belongs to your account, so it's only available when you're signed in.</p><button class="btn" data-open-app="accounts">Open Accounts</button></div></div>`;
        return;
      }
      let sim = null, msgs = [], tab = "chat", peer = null, wifi = onWifi(), shown = 0, data = 0, outbox = store.get("simOutbox:" + auth.user.id, []), note = "", busy = false, chan = null;
      const rpc = async (fn, args) => { const c = await auth.client(); const { data, error } = await c.rpc(fn, args); if (error) throw new Error(error.message.replace(/^.*?: /, "")); return data; };
      const pct = () => Math.max(0, Math.min(100, shown));
      const mine = m => m.from_number === sim.number;
      const convos = () => { const map = new Map(); for (const m of msgs) { const o = mine(m) ? m.to_number : m.from_number; if (!map.has(o) || map.get(o).created_at < m.created_at) map.set(o, m); } return [...map.entries()].sort((a, b) => b[1].created_at.localeCompare(a[1].created_at)); };
      const ago = t => { const d = (Date.now() - new Date(t)) / 6e4; return d < 1 ? "now" : d < 60 ? Math.floor(d) + "m" : d < 1440 ? Math.floor(d / 60) + "h" : new Date(t).toLocaleDateString(); };

      const pctD = () => Math.max(0, Math.min(100, data / 5));   // 500 MB = full
      const online = () => navigator.onLine !== false;
      const netLabel = () => wifi ? "📶 Wi-Fi" : online() ? "📱 Using banked data" : "✈ No connection";
      const card = () => `<div class="sim-card ${wifi ? "on" : ""}">
          <div class="sim-top"><span class="sim-chip"></span><span class="sim-net">${netLabel()}</span></div>
          <div class="sim-num" data-copy>${esc(sim.number)}</div>
          <div class="sim-bar"><i data-c style="width:${pct()}%"></i></div>
          <div class="sim-row"><span>${pct() >= 99.5 ? "🔋 Fully charged" : wifi ? "⚡ Charging on Wi-Fi…" : "⏸ Charging paused — join Wi-Fi"}</span><b data-cv>${Math.floor(pct())}%</b></div>
          <div class="sim-bar sim-data"><i data-d style="width:${pctD()}%"></i></div>
          <div class="sim-row"><span>${wifi ? "💾 Banking Wi-Fi data (+5 MB/min)" : data >= 2 ? "💾 Wi-Fi data you can use anywhere" : "💾 Out of Wi-Fi data — join Wi-Fi"}</span><b data-dv>${Math.floor(data)} MB</b></div></div>`;

      const draw = () => {
        const keepB = body.querySelector("[name=b]")?.value || "", keepTo = body.querySelector("[name=to]")?.value || "", hadFocus = document.activeElement?.name;
        drawNow();
        const b = body.querySelector("[name=b]"), t = body.querySelector("[name=to]");
        if (b && keepB) b.value = keepB; if (t && keepTo) t.value = keepTo;   // a redraw never wipes what you're typing
        if (hadFocus) body.querySelector(`[name=${hadFocus}]`)?.focus();
      };
      const drawNow = () => {
        if (!sim) { body.innerHTML = `<div class="sim"><p class="muted" style="padding:20px">${note ? "⚠️ " + esc(note) : "Setting up your SIM…"}</p></div>`; return; }
        body.innerHTML = `<div class="sim">${card()}
          <div class="seg"><button data-tab="chat" class="${tab === "chat" ? "on" : ""}">Messages</button><button data-tab="about" class="${tab === "about" ? "on" : ""}">About</button></div>
          ${note ? `<div class="tip" style="margin-bottom:10px">${esc(note)}</div>` : ""}
          ${tab === "about" ? about() : peer ? thread() : inbox()}</div>`;
        if (peer) { const l = body.querySelector(".sim-thread"); if (l) l.scrollTop = l.scrollHeight; }
      };
      const about = () => `<div class="list"><div><span>Your number</span><b>${esc(sim.number)}</b></div><div><span>Network</span><b>${wifi ? "Wi-Fi" : online() ? "Mobile / other" : "None"}</b></div><div><span>Wi-Fi data</span><b>${Math.floor(data)} / 500 MB</b></div><div><span>A message costs</span><b>2% charge${wifi ? "" : " + 2 MB"}</b></div></div>
        <p class="muted" style="font-size:13px"><b>What this is:</b> a Blockvile number for messaging other Blockvile users over Wi-Fi/internet. It charges 1% a minute while you're on Wi-Fi, and each message uses 2%.</p>
        <p class="muted" style="font-size:13px"><b>Wi-Fi data:</b> while you're on Wi-Fi the SIM also banks 5 MB a minute (up to 500 MB). When Wi-Fi is off or unavailable, SIM messages spend 2 MB each from that bank, so you can keep messaging. On Wi-Fi they cost no data. With no connection at all, messages wait and send when you're back online.</p>
        <p class="muted" style="font-size:13px"><b>What it isn't:</b> a phone-company SIM. It can't call or text normal phone numbers. The banked data is an allowance for Blockvile's own SIM messages. It doesn't create internet: when you're off Wi-Fi the message still travels over your phone's own mobile data connection.</p>
        <button class="btn ghost" data-copy>📋 Copy my number</button>`;
      const inbox = () => `<form class="sim-new" data-new><input class="field" name="to" placeholder="To: BV 0000 0000" autocomplete="off"><button class="btn">Chat</button></form>
        ${convos().map(([n, m]) => `<div class="todo" data-peer="${esc(n)}" style="cursor:pointer"><span style="flex:1;min-width:0"><b>${esc(n)}</b><br><small>${mine(m) ? "You: " : ""}${esc(m.body.slice(0, 60))}</small></span><small>${ago(m.created_at)}</small></div>`).join("") || `<p class="muted" style="text-align:center;margin-top:20px">No messages yet. Share your number with another Blockvile user, or start a chat above.</p>`}`;
      const thread = () => `<div class="toolbar"><button class="btn ghost" data-back>‹ Back</button><b style="margin-left:6px">${esc(peer)}</b></div>
        <div class="sim-thread">${msgs.filter(m => (mine(m) ? m.to_number : m.from_number) === peer).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(m => `<div class="sim-b ${mine(m) ? "me" : ""}">${esc(m.body)}<small>${ago(m.created_at)}</small></div>`).join("") + outbox.filter(o => o.to === peer).map(o => `<div class="sim-b me" style="opacity:.6">${esc(o.body)}<small>⏳ waiting for a connection</small></div>`).join("") || `<p class="muted" style="text-align:center">Say hello 👋</p>`}</div>
        <form class="sim-send" data-send><input class="field" name="b" placeholder="Message" autocomplete="off" maxlength="1000"><button class="btn" ${busy ? "disabled" : ""}>Send</button></form>`;

      const refresh = async () => { try { const c = await auth.client(); const { data } = await c.from("sim_messages").select("*").order("created_at", { ascending: false }).limit(200); if (data) { const had = msgs.length; msgs = data; if (data.length !== had && !body.querySelector("input:focus")) draw(); else if (data.length !== had) draw(); } } catch { } };
      let flushing = false;
      const flush = async () => {
        if (flushing || !outbox.length || !online() || !sim) return; flushing = true;
        try {
          while (outbox.length) {
            const o = outbox[0];
            try { const m = await rpc("sim_send", { to_number: o.to, body: o.body, on_wifi: onWifi() }); msgs.unshift(m); outbox.shift(); store.set("simOutbox:" + auth.user.id, outbox); }
            catch (e) { if (/connection|network|fetch/i.test(e.message)) break; note = "A waiting message couldn't be sent: " + e.message; outbox.shift(); store.set("simOutbox:" + auth.user.id, outbox); }
          }
          sim = await rpc("sim_get"); shown = Number(sim.charge); data = Number(sim.data_mb);
        } catch { }
        flushing = false; draw();
      };
      const charge = async () => {
        wifi = onWifi();
        try { sim = await rpc("sim_charge", { on_wifi: wifi }); shown = Number(sim.charge); data = Number(sim.data_mb); note = ""; flush(); }
        catch (e) { if (!sim) { note = /sim_get|function|schema/i.test(e.message) ? "Run supabase/schema.sql in your Supabase project first" : e.message; } }
        draw();
      };
      (async () => {
        try { sim = await rpc("sim_get"); shown = Number(sim.charge); data = Number(sim.data_mb); } catch (e) { note = /sim_get|function|schema/i.test(e.message) ? "Run supabase/schema.sql in your Supabase project first" : e.message; return draw(); }
        await charge(); await refresh();
        try { const c = await auth.client(); chan = c.channel("sim-" + sim.user_id).on("postgres_changes", { event: "INSERT", schema: "public", table: "sim_messages" }, () => refresh()).subscribe(); } catch { }
      })();

      // keep charging while the app is open: show it filling, and tell the server once a minute
      const tick = setInterval(() => { if (!body.isConnected) { clearInterval(tick); clearInterval(sync); try { chan && auth.client().then(c => c.removeChannel(chan)); } catch { } return; } if (sim && wifi) { shown = Math.min(100, shown + 1 / 12); data = Math.min(500, data + 5 / 12); const f = body.querySelector("[data-c]"); if (f) f.style.width = pct() + "%"; const b = body.querySelector("[data-cv]"); if (b) b.textContent = Math.floor(pct()) + "%"; const fd = body.querySelector("[data-d]"); if (fd) fd.style.width = pctD() + "%"; const bd = body.querySelector("[data-dv]"); if (bd) bd.textContent = Math.floor(data) + " MB"; } }, 5000);
      const sync = setInterval(() => { if (body.isConnected && sim) { charge(); refresh(); } }, 60000);
      const nets = () => { if (sim && body.isConnected) { wifi = onWifi(); draw(); charge(); } };
      window.addEventListener("online", nets); window.addEventListener("offline", nets);
      window.addEventListener("bv:auth", function f() { if (!body.isConnected) return window.removeEventListener("bv:auth", f); if (!A().signedIn()) os.close("sim", true); });

      body.addEventListener("click", async e => {
        const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; note = ""; return draw(); }
        const p = e.target.closest("[data-peer]"); if (p) { peer = p.dataset.peer; note = ""; return draw(); }
        if (e.target.closest("[data-back]")) { peer = null; note = ""; return draw(); }
        if (e.target.closest("[data-copy]")) { try { await navigator.clipboard.writeText(sim.number); os.toast("📋 Number copied"); } catch { os.toast(sim.number); } }
      });
      body.addEventListener("submit", async e => {
        const n = e.target.closest("[data-new]"), s = e.target.closest("[data-send]");
        if (n) { e.preventDefault(); const to = n.to.value.trim().toUpperCase().replace(/\s+/g, " "); if (!/^BV \d{4} \d{4}$/.test(to)) { note = "Numbers look like BV 1234 5678"; return draw(); } if (to === sim.number) { note = "That's your own number"; return draw(); } peer = to; note = ""; return draw(); }
        if (s) {
          e.preventDefault(); const text = s.b.value.trim(); if (!text || busy) return;
          busy = true; note = "";
          wifi = onWifi();
          if (!online()) { outbox.push({ to: peer, body: text }); store.set("simOutbox:" + auth.user.id, outbox); note = "No connection — your message will send when you're back online"; busy = false; draw(); return; }
          try { const m = await rpc("sim_send", { to_number: peer, body: text, on_wifi: wifi }); msgs.unshift(m); sim = await rpc("sim_get"); shown = Number(sim.charge); data = Number(sim.data_mb); }
          catch (err) { note = err.message; }
          busy = false; draw(); body.querySelector("[name=b]")?.focus();
        }
      });
    }
  };

  /* ================= Blockvile AI ================= */
  window.BV_APPS.push({
    id: "ai", name: "Blockvile AI", icon: "✨", bg: "linear-gradient(135deg,#a855f7,#ec4899)", cat: "System", size: [480, 580],
    keywords: "ai assistant chat ask claude help bot smart",
    render(body, os) {
      const auth = A();
      let chat = store.get("aiChat", []), busy = false, pendingAction = null;
      const save = () => store.set("aiChat", chat.slice(-40));

      /* things the assistant can do on this device, with no internet and no account */
      const appByName = q => { q = q.toLowerCase().trim().replace(/^(the|my)\s+/, "").replace(/\s+app$/, ""); const apps = os.apps(); return apps.find(a => a.name.toLowerCase() === q || a.id === q) || apps.find(a => a.name.toLowerCase().startsWith(q) && q.length > 2) || apps.find(a => (a.keywords || "").split(" ").includes(q)); };
      const mathy = s => { const m = s.replace(/^(what('?s| is)|calculate|calc|=)\s*/i, "").replace(/[?]/g, "").replace(/x/g, "*").trim(); return /^[\d\s+\-*/().%^,]+$/.test(m) && /\d/.test(m) && /[+\-*/^%]/.test(m) ? m : null; };
      function local(text) {
        const t = text.trim(), l = t.toLowerCase().replace(/[.!?]+$/, "");
        let m;
        if ((m = l.match(/^(?:please )?(?:open|launch|start|go to|show)\s+(.+)$/))) { const a = appByName(m[1]); if (a) { os.open(a.id); return `Opening ${a.name}.`; } return `I couldn't find an app called "${m[1]}".`; }
        if (/^(?:turn |switch )?(?:on |to )?dark( mode)?( on)?$|^(?:turn|switch) on dark/.test(l) || /dark mode on|enable dark/.test(l)) { if (os.state.theme !== "dark" || os.state.autoTheme) { os.state.autoTheme = false; os.state.theme = "dark"; os.save(); os.apply(); } return "Dark mode is on 🌙"; }
        if (/light mode|dark mode off|disable dark|turn off dark/.test(l)) { os.state.autoTheme = false; os.state.theme = "light"; os.save(); os.apply(); return "Light mode is on ☀️"; }
        if (/toggle dark|switch theme/.test(l)) { os.toggleDark(); return "Done."; }
        if ((m = l.match(/(?:switch to |use |go to )?(phone|tablet|laptop)(?: mode)?$/)) && /mode|switch|use/.test(l)) { os.setMode(m[1]); return `Switched to ${m[1]} mode.`; }
        if (/(end|stop|exit|leave).*(takeover|take over)|application exit/.test(l)) { return os.endTakeover() ? "Ended the temporary takeover. Your device is back to normal." : "No temporary takeover is running."; }
        if (/(temporar\w+ )?(take ?over|take over)( this| the)?( device| phone)?$/.test(l) || /start.*takeover/.test(l)) { pendingAction = "takeover"; return "This temporarily lets Blockvile take over your device, only until you end it. Start it?"; }
        if (/what time|the time$|time is it/.test(l)) return "It's " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ".";
        if (/today'?s date|what day|the date$|what('s| is) the date/.test(l)) return "Today is " + new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + ".";
        if (/sim number|my number/.test(l)) return auth.signedIn() ? "Open Digital SIM to see your number." : "Sign in first — the Digital SIM is only for signed-in users.";
        if (/^(hi|hello|hey)\b/.test(l)) return "Hi! Ask me anything, or tell me to open an app, switch modes or turn dark mode on.";
        if (mathy(l)) { try { return "= " + window.BV.safeMath(mathy(l)); } catch { } }
        return null;
      }
      // actions the online AI may ask for (whitelisted; taking over always asks you first)
      function act(a) {
        const [cmd, ...r] = a.trim().toLowerCase().split(/\s+/), arg = r.join(" ");
        if (cmd === "open") { const x = appByName(arg); if (x) os.open(x.id); }
        else if (cmd === "dark") { os.state.autoTheme = false; os.state.theme = arg === "off" ? "light" : "dark"; os.save(); os.apply(); }
        else if (cmd === "mode" && ["phone", "tablet", "laptop"].includes(arg)) os.setMode(arg);
        else if (cmd === "takeover") pendingAction = "takeover";
        else if (cmd === "exit" ) { os.endTakeover(); }
      }

      async function cloud() {
        if (!auth.configured()) return "I can run commands on your device without internet — try “open notes” or “dark mode on”. To answer other questions, the owner needs to connect Supabase (Accounts → Setup).";
        if (!auth.signedIn()) return "Sign in (Accounts) to ask me general questions. I can still do device commands like “open notes” without signing in.";
        const c = await auth.client();
        const { data, error } = await c.functions.invoke(auth.settings().fn, { body: { messages: chat.slice(-12).map(m => ({ role: m.role, content: m.text })) } });
        if (error || !data?.reply) {
          let why = ""; try { why = (await error?.context?.json?.())?.error || ""; } catch { }
          return why || "I couldn't reach the AI. The AI function may not be deployed yet (see supabase/functions/ai).";
        }
        return data.reply;
      }

      const bubble = m => `<div class="ai-b ${m.role === "user" ? "me" : ""}">${esc(m.text).replace(/\n/g, "<br>")}</div>`;
      const draw = () => {
        const keep = body.querySelector("[name=q]")?.value || "";
        body.innerHTML = `<div class="ai"><div class="ai-log">${chat.length ? chat.map(bubble).join("") : `<div class="ai-hello"><div style="font-size:46px">✨</div><h3>Blockvile AI</h3><p class="muted">Ask a question, or tell your device what to do.</p>
            <div class="ai-sugg">${["Open settings", "Dark mode on", "What time is it?", "Switch to laptop mode", "Explain how Wi-Fi works"].map(s => `<button class="btn ghost" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>`}
          ${busy ? `<div class="ai-b typing">Thinking…</div>` : ""}
          ${pendingAction === "takeover" ? `<div class="ai-b"><button class="btn" data-go="takeover">Start temporary takeover</button> <button class="btn ghost" data-go="no">No thanks</button></div>` : ""}</div>
          <form class="ai-in" data-q><input class="field" name="q" placeholder="Ask Blockvile AI…" autocomplete="off" value="${esc(keep)}"><button class="btn" ${busy ? "disabled" : ""}>Send</button></form>
          ${chat.length ? `<button class="link-btn" data-clear style="margin:6px auto 0;display:block">Clear chat</button>` : ""}</div>`;
        const lg = body.querySelector(".ai-log"); lg.scrollTop = lg.scrollHeight;
      };
      async function ask(text) {
        if (!text.trim() || busy) return;
        pendingAction = null; chat.push({ role: "user", text: text.trim() }); save();
        const l = local(text);
        if (l != null) { chat.push({ role: "assistant", text: l }); save(); return draw(); }
        busy = true; draw();
        let reply; try { reply = await cloud(); } catch (e) { reply = e.message || "Something went wrong."; }
        const acts = [...reply.matchAll(/\[\[action:\s*([^\]]+)\]\]/gi)];
        acts.forEach(a => act(a[1]));
        reply = reply.replace(/\[\[action:[^\]]*\]\]/gi, "").trim() || "Done.";
        chat.push({ role: "assistant", text: reply }); save(); busy = false; draw();
      }
      body.addEventListener("click", e => {
        const s = e.target.closest("[data-s]"); if (s) return ask(s.dataset.s);
        const g = e.target.closest("[data-go]"); if (g) { const a = g.dataset.go; pendingAction = null; if (a === "takeover") os.startTakeover(); return draw(); }
        if (e.target.closest("[data-clear]")) { chat = []; save(); draw(); }
      });
      body.addEventListener("submit", e => { const f = e.target.closest("[data-q]"); if (!f) return; e.preventDefault(); const v = f.q.value; f.q.value = ""; ask(v); });
      draw();
    }
  });
})();

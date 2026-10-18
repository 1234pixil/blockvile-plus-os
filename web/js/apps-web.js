/* Blockvile Plus OS — websites stay inside Blockvile.
   BV.openWeb(url) shows a site in a Blockvile window (web version) or in the app's own in-app browser (Android).
   Some big sites (Google Play, Gmail, YouTube, Facebook …) forbid being shown inside another page — that's their rule,
   not something an app can override. For those the window says so and offers "Open outside Blockvile". */
(() => {
  const { esc } = window.BV;
  const A = window.BV_APPS;
  const os = () => window.BlockvileOS;
  const isWeb = u => /^https?:\/\//i.test(String(u || "").trim());
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return String(u); } };
  // sites that refuse to be framed (they send X-Frame-Options / frame-ancestors)
  const BLOCKS = /(^|\.)(play\.google\.com|accounts\.google\.com|mail\.google\.com|drive\.google\.com|docs\.google\.com|calendar\.google\.com|myaccount\.google\.com|youtube\.com|facebook\.com|instagram\.com|twitter\.com|x\.com|github\.com|linkedin\.com|amazon\.[a-z.]+|netflix\.com|outlook\.live\.com|office\.com|teams\.microsoft\.com|onedrive\.live\.com|account\.microsoft\.com|login\.live\.com|login\.microsoftonline\.com|paypal\.com|reddit\.com)$/i;
  const blocked = u => { try { return BLOCKS.test(new URL(u).hostname); } catch { return false; } };
  const outside = u => { try { window.open(u, "_blank", "noopener"); } catch { } };   // an explicit "open outside" choice (Android: phone browser)

  function openWeb(url, title) {
    url = String(url || "").trim();
    if (!isWeb(url)) return false;
    const nat = window.BV.android;
    if (nat?.available) { nat.inApp(url); return true; }       // Android: Blockvile's own in-app browser — any site works
    os()?.open("webview", { url, title: title || host(url) });
    return true;
  }
  window.BV.openWeb = openWeb;
  window.BV.openOutside = outside;
  window.BV.webBlocked = blocked;

  A.push({
    id: "webview", name: "Web", icon: "🌐", bg: "linear-gradient(135deg,#0ea5e9,#6366f1)", cat: "Internet", hidden: true, net: true, size: [900, 640],
    render(body, o, args) {
      let url = args?.url || "";
      body.style.padding = "0";
      if (!isWeb(url)) { body.innerHTML = `<p class="muted" style="padding:20px">Nothing to show.</p>`; return; }
      o.setTitle("webview", args.title || host(url));
      const bar = `<div class="toolbar" style="padding:8px 10px;margin:0;border-bottom:1px solid var(--line)"><small class="muted" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(url)}</small>
        <button class="btn ghost" data-r title="Reload">↻</button><button class="btn ghost" data-x title="Opens in your browser, outside Blockvile">↗ Open outside Blockvile</button></div>`;
      if (blocked(url)) {
        body.innerHTML = `${bar}<div style="padding:26px 22px;max-width:520px;margin:0 auto;text-align:center">
          <div style="font-size:46px">🛡️</div><h3 style="margin:8px 0">${esc(host(url))} doesn't allow being shown inside other apps</h3>
          <p class="muted">That's the website's own rule, so Blockvile can't show it in a window here. In the <b>Blockvile Android app</b> it opens inside the app instead.</p>
          <p><button class="btn" data-x>↗ Open outside Blockvile</button></p></div>`;
      } else {
        body.innerHTML = `${bar}<iframe src="${esc(url)}" title="${esc(host(url))}" style="width:100%;height:calc(100% - 50px);border:0;background:#fff" referrerpolicy="no-referrer"
          allow="autoplay; encrypted-media; fullscreen" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation"></iframe>
          <div class="muted" style="position:absolute;left:0;right:0;bottom:0;font-size:11px;text-align:center;padding:3px;pointer-events:none;background:linear-gradient(transparent,var(--bg,transparent))">Page blank? This site may not allow being shown here — use “Open outside Blockvile”.</div>`;
      }
      body.addEventListener("click", e => {
        if (e.target.closest("[data-x]")) outside(url);
        if (e.target.closest("[data-r]")) { const f = body.querySelector("iframe"); if (f) f.src = f.src; }
      });
    },
  });

  // links that would open a new tab stay inside Blockvile instead
  document.addEventListener("click", e => {
    const a = e.target.closest?.("a[target=_blank]"); if (!a || !a.href) return;
    if (e.defaultPrevented || !isWeb(a.href)) return;
    e.preventDefault(); openWeb(a.href, a.textContent.trim().slice(0, 40));
  });
})();

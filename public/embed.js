/**
 * Rialink Embed Widget
 *
 * Self-contained verification badge for any website.
 *
 * Usage:
 *   <script src="https://rialink.vercel.app/embed.js"
 *     data-wallet="wallet_address"
 *     data-theme="dark"
 *   ></script>
 */

(function() {
  "use strict";

  var BASE_URL = "https://rialink.vercel.app";
  var WIDGET_CLASS = "rialink-badge";

  // ─── SVG Icons ──────────────────────────────────────────────

  var ICONS = {
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>',
    discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
    farcaster: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.23 0A5.23 5.23 0 000 5.23v13.54A5.23 5.23 0 005.23 24h13.54A5.23 5.23 0 0024 18.77V5.23A5.23 5.23 0 0018.77 0H5.23zm7.42 4.77h4.52c.35 0 .68.07.98.21.3.14.55.33.74.58.2.24.34.53.42.85.08.33.12.67.12 1.03 0 .57-.13 1.07-.38 1.5-.25.43-.58.77-1 1.02-.42.25-.88.37-1.38.37H11.5v6.03h1.15V4.77zm-4.04 1.15h3.37c.47 0 .87.09 1.2.26.33.18.59.42.78.73.2.3.3.65.3 1.05 0 .4-.1.75-.3 1.05-.2.3-.46.53-.78.68-.33.15-.73.23-1.2.23H7.48v4.38h1.1V5.92zm-2.8 1.15h1.02v7.18H4.7V5.92h1.1zm6.88 9.98h-1.1V11.5h1.1v5.55zm4.42-1.15h-3.37c-.47 0-.87-.09-1.2-.26-.33-.18-.59-.42-.78-.73-.2-.3-.3-.65-.3-1.05 0-.4.1-.75.3-1.05.2-.3.46-.53.78-.68.33-.15.73-.23 1.2-.23h3.37v1.1h-3.27c-.35 0-.65.06-.9.18-.25.12-.44.28-.58.48-.14.2-.21.43-.21.68 0 .25.07.48.21.68.14.2.33.36.58.48.25.12.55.18.9.18h3.27v1.1z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 13l4 4L19 7"/></svg>'
  };

  // ─── Trust level colors ─────────────────────────────────────

  function trustColor(level) {
    switch (level) {
      case "high": return "#E8E3D5";
      case "medium": return "#9CA3AF";
      case "low": return "#6B7280";
      default: return "#4B5563";
    }
  }

  // ─── Render widget ──────────────────────────────────────────

  function renderBadge(container, data) {
    var theme = container.getAttribute("data-theme") || "dark";
    var isDark = theme === "dark";

    var bgColor = isDark ? "#1A1A1A" : "#FFFFFF";
    var textColor = isDark ? "#E8E3D5" : "#1A1A1A";
    var mutedColor = isDark ? "#9CA3AF" : "#6B7280";
    var borderColor = isDark ? "rgba(232,227,213,0.08)" : "rgba(0,0,0,0.08)";

    var trust = data.trustLevel || "none";
    var platforms = data.verifiedPlatforms || [];
    var total = data.totalVerified || 0;
    var max = data.maxPossible || 3;

    var html = '<div style="font-family:system-ui,-apple-system,sans-serif;background:' + bgColor + ';color:' + textColor + ';border:1px solid ' + borderColor + ';border-radius:12px;padding:16px 20px;display:inline-flex;align-items:center;gap:14px;min-width:220px;">';

    // Platform icons
    html += '<div style="display:flex;gap:6px;">';
    var allPlatforms = ["github", "discord", "farcaster"];
    for (var i = 0; i < allPlatforms.length; i++) {
      var p = allPlatforms[i];
      var verified = platforms.indexOf(p) !== -1;
      var color = verified ? trustColor(trust) : mutedColor;
      var opacity = verified ? "1" : "0.3";
      html += '<span style="color:' + color + ';opacity:' + opacity + ';width:18px;height:18px;">' + ICONS[p] + '</span>';
    }
    html += '</div>';

    // Text
    html += '<div style="flex:1;">';
    html += '<div style="font-weight:600;font-size:14px;line-height:1.2;">';
    html += total > 0 ? total + '/' + max + ' verified' : 'Not verified';
    html += '</div>';
    html += '<div style="font-size:12px;color:' + mutedColor + ';margin-top:2px;text-transform:capitalize;">';
    html += trust + ' trust';
    html += '</div>';
    html += '</div>';

    // Check badge
    if (total > 0) {
      html += '<span style="color:' + trustColor(trust) + ';width:20px;height:20px;">' + ICONS.check + '</span>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  // ─── Fetch and render ───────────────────────────────────────

  function initWidget(el) {
    var wallet = el.getAttribute("data-wallet");
    if (!wallet) return;

    // Loading state
    el.innerHTML = '<div style="font-family:system-ui;background:#1A1A1A;color:#9CA3AF;border:1px solid rgba(232,227,213,0.08);border-radius:12px;padding:16px 20px;display:inline-flex;align-items:center;gap:14px;min-width:220px;"><span style="font-size:13px;">Loading...</span></div>';

    fetch(BASE_URL + "/api/verify/" + wallet)
      .then(function(res) { return res.json(); })
      .then(function(data) { renderBadge(el, data); })
      .catch(function() {
        el.innerHTML = '<div style="font-family:system-ui;background:#1A1A1A;color:#6B7280;border:1px solid rgba(232,227,213,0.08);border-radius:12px;padding:16px 20px;display:inline-flex;align-items:center;gap:14px;min-width:220px;"><span style="font-size:13px;">Error loading verification</span></div>';
      });
  }

  // ─── Auto-init ──────────────────────────────────────────────

  function initAll() {
    var els = document.querySelectorAll("." + WIDGET_CLASS + ":not([data-initialized])");
    for (var i = 0; i < els.length; i++) {
      els[i].setAttribute("data-initialized", "true");
      initWidget(els[i]);
    }
  }

  // Run on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

  // Re-init on dynamic DOM changes
  if (typeof MutationObserver !== "undefined") {
    var observer = new MutationObserver(initAll);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Expose for manual init
  window.RialinkBadge = { init: initAll };
})();

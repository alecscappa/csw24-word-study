// Paint the saved theme before anything else loads, so a reload (or the phone's top bar) doesn't flash the default green.
// applySettings() in the app script writes csw24:paint with the finished colours for light and dark.
try {
  const p = JSON.parse(localStorage.getItem("csw24:paint"));
  if (p) {
    const dark = p.mode === "dark" || (p.mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    const r = document.documentElement, tok = p[dark ? "dark" : "light"];
    for (const k in tok) r.style.setProperty("--" + k, tok[k]);
    r.style.colorScheme = dark ? "dark" : "light";
    r.style.fontSize = p.size;
    r.dataset.values = p.values;
    r.dataset.tstyle = p.tstyle || "soft";
    r.dataset.tfont = p.tfont || "sans";
    r.dataset.theme = p.theme || ""; r.dataset.mode = dark ? "dark" : "light";
    document.getElementById("themeColor").content = tok.head;
  }
} catch {}

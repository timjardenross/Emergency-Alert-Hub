const stateCards = document.getElementById("state-cards");
const siteRows = document.getElementById("site-rows");
const search = document.getElementById("search");
const stateFilter = document.getElementById("state-filter");
const brandFilter = document.getElementById("brand-filter");
const ratingFilter = document.getElementById("rating-filter");
const typeFilter = document.getElementById("type-filter");
const downloadStatesBtn = document.getElementById("download-states");
const exportCsvBtn = document.getElementById("export-csv");
const downloadTemplateBtn = document.getElementById("download-template");
const importCsvInput = document.getElementById("import-csv");
const applyCsvBtn = document.getElementById("apply-csv");
const resetCsvBtn = document.getElementById("reset-csv");
const csvInput = document.getElementById("csv-input");
const csvStatus = document.getElementById("csv-status");
const lastUpdated = document.getElementById("last-updated");

const ratingOrder = { High: 0, Moderate: 1, Watch: 2, Low: 3 };
const SAMPLE_DATA = structuredClone(window.SITE_DATA);
const SITES_CSV_URL = "./data/sites.csv";
const STATES_CSV_URL = "./data/states.csv";
const SAMPLE_CSV_URL = "./data/sites.sample.csv";
const VALID_RATINGS = new Set(["High", "Moderate", "Watch", "Low"]);

function badgeClass(rating) {
  return `badge badge--${rating.toLowerCase()}`;
}

function pillClass(rating) {
  return `rating-pill badge--${rating.toLowerCase()}`;
}

function uniqueValues(key) {
  return [...new Set(window.SITE_DATA.sites.map((d) => d[key]))].sort();
}

function option(value, label) {
  const el = document.createElement("option");
  el.value = value;
  el.textContent = label;
  return el;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(sites) {
  const header = ["state", "site_name", "brand", "site_type", "risk_rating", "direct_area", "impact_summary"];
  const lines = [header.join(",")];
  sites.forEach((site) => {
    lines.push(header.map((key) => csvEscape(site[key])).join(","));
  });
  return lines.join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          value += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        value += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(value);
      value = "";
    } else if (ch === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += ch;
    }
  }
  row.push(value);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

function rowsToSites(rows) {
  const [header, ...dataRows] = rows;
  if (!header) throw new Error("CSV is empty.");
  const keys = header.map((h) => h.trim());
  const required = ["state", "site_name", "brand", "site_type", "risk_rating", "direct_area", "impact_summary"];
  for (const key of required) {
    if (!keys.includes(key)) throw new Error(`Missing column: ${key}`);
  }
  const errors = [];
  const sites = dataRows
    .filter((row) => row.some((cell) => String(cell || "").trim() !== ""))
    .map((row, index) => {
      const record = {};
      keys.forEach((key, idx) => { record[key] = (row[idx] || "").trim(); });
      if (!VALID_RATINGS.has(record.risk_rating)) {
        errors.push(`Row ${index + 2}: invalid risk rating "${record.risk_rating}"`);
      }
      const missing = required.filter((key) => !record[key]);
      if (missing.length) {
        errors.push(`Row ${index + 2}: missing ${missing.join(", ")}`);
      }
      return record;
    });
  if (errors.length) throw new Error(errors.join(" | "));
  return sites;
}

function rowsToStates(rows) {
  const [header, ...dataRows] = rows;
  if (!header) throw new Error("CSV is empty.");
  const keys = header.map((h) => h.trim());
  const required = ["code", "name", "summary"];
  for (const key of required) {
    if (!keys.includes(key)) throw new Error(`Missing column: ${key}`);
  }
  const errors = [];
  const states = dataRows
    .filter((row) => row.some((cell) => String(cell || "").trim() !== ""))
    .map((row, index) => {
      const record = {};
      keys.forEach((key, idx) => { record[key] = (row[idx] || "").trim(); });
      const missing = required.filter((key) => !record[key]);
      if (missing.length) {
        errors.push(`Row ${index + 2}: missing ${missing.join(", ")}`);
      }
      return record;
    });
  if (errors.length) throw new Error(errors.join(" | "));
  return states;
}

async function loadCsv(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  const text = await response.text();
  return text;
}

async function loadDataFromCsv() {
  const [statesText, sitesText] = await Promise.all([
    loadCsv(STATES_CSV_URL),
    loadCsv(SITES_CSV_URL),
  ]);
  const states = rowsToStates(parseCsv(statesText));
  const sites = rowsToSites(parseCsv(sitesText));
  window.SITE_DATA = { states, sites };
}

function initFilters() {
  stateFilter.replaceChildren();
  brandFilter.replaceChildren();
  ratingFilter.replaceChildren();
  typeFilter.replaceChildren();
  stateFilter.append(option("", "All states"));
  window.SITE_DATA.states.forEach((state) => stateFilter.append(option(state.code, state.name)));

  brandFilter.append(option("", "All brands"));
  uniqueValues("brand").forEach((v) => brandFilter.append(option(v, v)));

  ratingFilter.append(option("", "All ratings"));
  ["High", "Moderate", "Watch", "Low"].forEach((v) => ratingFilter.append(option(v, v)));

  typeFilter.append(option("", "All types"));
  uniqueValues("site_type").forEach((v) => typeFilter.append(option(v, v)));
}

function renderStateCards() {
  stateCards.innerHTML = "";
  window.SITE_DATA.states.forEach((state) => {
    const stateSites = window.SITE_DATA.sites.filter((d) => d.state === state.code);
    const dominant = stateSites.sort((a, b) => ratingOrder[a.risk_rating] - ratingOrder[b.risk_rating])[0];
    const total = stateSites.length;
    const card = document.createElement("article");
    card.className = "state-card";
    card.innerHTML = `
      <h3>${state.code} <span class="${badgeClass(dominant?.risk_rating || "Low")}">${dominant?.risk_rating || "Low"}</span></h3>
      <p>${state.summary}</p>
      <div class="state-card__footer">
        <span>${total} public sites</span>
        <span>${dominant?.site_type || "Public footprint"}</span>
      </div>
    `;
    stateCards.append(card);
  });
}

function matches(site) {
  const q = search.value.trim().toLowerCase();
  const haystack = `${site.state} ${site.site_name} ${site.brand} ${site.site_type} ${site.risk_rating} ${site.direct_area} ${site.impact_summary}`.toLowerCase();
  return (!q || haystack.includes(q)) &&
    (!stateFilter.value || site.state === stateFilter.value) &&
    (!brandFilter.value || site.brand === brandFilter.value) &&
    (!ratingFilter.value || site.risk_rating === ratingFilter.value) &&
    (!typeFilter.value || site.site_type === typeFilter.value);
}

function renderSites() {
  const rows = window.SITE_DATA.sites.filter(matches);
  siteRows.innerHTML = "";
  rows
    .sort((a, b) => a.state.localeCompare(b.state) || ratingOrder[a.risk_rating] - ratingOrder[b.risk_rating] || a.site_name.localeCompare(b.site_name))
    .forEach((site) => {
      const tr = document.createElement("tr");
      tr.className = "site-row";
      tr.innerHTML = `
        <td>${site.state}</td>
        <td><strong>${site.site_name}</strong></td>
        <td>${site.brand}</td>
        <td>${site.site_type}</td>
        <td><span class="${pillClass(site.risk_rating)}">${site.risk_rating}</span></td>
        <td>${site.direct_area}</td>
        <td>${site.impact_summary}</td>
      `;
      siteRows.append(tr);
    });
}

function download(filename, content, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function statesToCsv(states) {
  const header = ["code", "name", "summary"];
  const lines = [header.join(",")];
  states.forEach((state) => {
    lines.push([
      csvEscape(state.code),
      csvEscape(state.name),
      csvEscape(state.summary),
    ].join(","));
  });
  return lines.join("\n");
}

function refreshAll() {
  initFilters();
  renderStateCards();
  renderSites();
}

function setStatus(message, isError = false) {
  if (!csvStatus) return;
  csvStatus.textContent = message;
  csvStatus.classList.toggle("csv-note--error", isError);
}

function setLastUpdated() {
  if (!lastUpdated) return;
  const now = new Date();
  lastUpdated.textContent = `Last updated: ${now.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function loadSites(sites) {
  window.SITE_DATA = { ...window.SITE_DATA, sites };
  refreshAll();
}

function wire() {
  [search, stateFilter, brandFilter, ratingFilter, typeFilter].forEach((el) => {
    el.addEventListener("input", renderSites);
    el.addEventListener("change", renderSites);
  });

  downloadStatesBtn?.addEventListener("click", () => {
    download("states.csv", statesToCsv(window.SITE_DATA.states));
  });

  exportCsvBtn?.addEventListener("click", () => {
    download("emergency-alert-hub-sites.csv", toCsv(window.SITE_DATA.sites));
  });

  downloadTemplateBtn?.addEventListener("click", () => {
    loadCsv(SAMPLE_CSV_URL)
      .then((text) => download("sites.sample.csv", text))
      .catch(() => download("sites.sample.csv", toCsv(window.SITE_DATA.sites)));
  });

  importCsvInput?.addEventListener("change", async () => {
    const file = importCsvInput.files?.[0];
    if (!file) return;
    const text = await file.text();
    csvInput.value = text;
  });

  applyCsvBtn?.addEventListener("click", () => {
    try {
      const sites = rowsToSites(parseCsv(csvInput.value));
      loadSites(sites);
      setStatus(`Loaded ${sites.length} site rows from CSV.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  resetCsvBtn?.addEventListener("click", () => {
    window.SITE_DATA = structuredClone(SAMPLE_DATA);
    csvInput.value = "";
    setStatus("Sample data restored.");
    setLastUpdated();
    refreshAll();
  });
}

async function boot() {
  try {
    await loadDataFromCsv();
  } catch {
    window.SITE_DATA = structuredClone(SAMPLE_DATA);
    setStatus("Using local fallback data because the CSV source could not be loaded.", true);
  }
  setLastUpdated();
  refreshAll();
  wire();
}

boot();

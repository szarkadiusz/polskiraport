const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" };

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extra }
  });
}

function normalizeIdentifier(value) {
  const raw = decodeURIComponent(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (/^\d{10}$/.test(raw) || /^\d{10}$/.test(digits)) return { type: "krs", value: digits };
  if (/^\d{9}$/.test(digits) || /^\d{14}$/.test(digits)) return { type: "regon", value: digits };
  if (/^\d{10}$/.test(digits)) return { type: "nip", value: digits };
  return { type: "name", value: raw };
}

function addressFromKrs(a = {}) {
  return [a.ulica, a.nrDomu, a.nrLokalu, a.kodPocztowy, a.miejscowosc].filter(Boolean).join(" ");
}

function normalizeKrs(payload, krs) {
  const d = payload?.odpis?.dane?.dzial1 || {};
  const p = d.danePodmiotu || {};
  const ids = p.identyfikatory || {};
  const a = d.siedzibaIAdres?.adres || {};
  const pkdRaw = Array.isArray(d.przedmiotDzialalnosci) ? d.przedmiotDzialalnosci :
    (Array.isArray(d.przedmiotDzialalnosciDodatkowy) ? d.przedmiotDzialalnosciDodatkowy : []);
  const representation = d.reprezentacja || d.organReprezentacji || null;
  return {
    name: p.nazwa || "Podmiot KRS " + krs,
    krs,
    nip: ids.nip || null,
    regon: ids.regon || null,
    legalForm: p.formaPrawna || null,
    address: addressFromKrs(a) || null,
    registrationDate: d.dataRejestracji || null,
    updateDate: payload?.odpis?.naglowekA?.stanZDnia || null,
    status: "podmiot znaleziony w KRS",
    pkd: pkdRaw.map(x => ({ code: x.kodPKD || x.kod || null, description: x.opis || null, type: "KRS" })),
    representation,
    source: "KRS Open API"
  };
}

async function getKrs(krs) {
  const base = "https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/" + krs + "?format=json";
  let response = await fetch(base + "&rejestr=P", { headers: { accept: "application/json" } });
  if (response.status === 404) response = await fetch(base + "&rejestr=S", { headers: { accept: "application/json" } });
  if (!response.ok) {
    return json({ error: response.status === 404 ? "Nie znaleziono podmiotu o podanym numerze KRS." : "Źródło KRS jest chwilowo niedostępne." }, response.status === 404 ? 404 : 502);
  }
  const payload = await response.json();
  return json(normalizeKrs(payload, krs));
}

export async function onRequestGet(context) {
  const identifier = normalizeIdentifier(context.params.identifier);
  if (!identifier.value) return json({ error: "Podaj KRS, NIP, REGON lub nazwę firmy." }, 400);

  if (identifier.type === "krs") return getKrs(identifier.value);

  if (identifier.type === "nip" || identifier.type === "regon") {
    if (!context.env.GUS_BIR_API_KEY) {
      return json({
        error: "Integracja GUS BIR1 wymaga klucza API.",
        identifier: identifier.type,
        next: "Ustaw sekret GUS_BIR_API_KEY w Cloudflare Pages."
      }, 503);
    }
    return json({
      error: "Adapter GUS BIR1 jest przygotowany jako kolejny etap integracji.",
      identifier: identifier.type
    }, 501);
  }

  return json({
    error: "Wyszukiwanie po nazwie wymaga indeksu backendowego. Najpierw uruchomimy źródło GUS BIR1, a następnie indeks firm.",
    identifier: "name"
  }, 501);
}

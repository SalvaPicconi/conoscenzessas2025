import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const SESSION_HOURS = 6;
const ALLOWED_ORIGINS = new Set([
  "https://salvapicconi.github.io",
  "http://localhost:8420",
  "http://127.0.0.1:8420",
]);
const AUTHORS = new Set([
  "Prof. Picconi", "Prof. Pinna", "Prof.ssa Manca",
  "Prof.ssa Cossu", "Prof.ssa Preite", "Prof.ssa Sanna",
  "Prof.ssa Onnis", "Prof. Carlo Cossu", "Prof.ssa Celina Murgia",
  "Prof.ssa Isabella Urru",
]);
const STATES = new Set(["bozza", "approvata", "applicata", "archiviata"]);
const FIELDS = new Set([
  "anno", "competenza", "qnq",
  "periodo", "assi", "competenzeGenerali", "competenzeSSAS", "competenzeEuropee",
  "titolo", "traguardo", "compito", "situazione", "prodotto",
  "beneficiari", "ambito", "areaTirocinio", "ore", "abilita", "saperi",
  "integrazioniSaperi", "segnalazioneSaperi", "sviluppata", "oreRipartizione",
]);
// Scostamento massimo del docente dalla proposta proporzionale delle ore.
const ORE_TOLLERANZA = 0.4;
const ORE_MASSIME_UDA = 400;
// Voti a disposizione di ogni docente per anno di corso e genere di UDA:
// tanti quante sono le UDA da scegliere.
const VOTI_PER_DOCENTE = 2;
const GENERI_UDA = new Set(["asse", "trasversale"]);
const CHIAVE_VOTABILE = /^([0-9]+\.[0-9]+|T[1-5]\.[0-9]+)$/;

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function permissionsFor(authorName: string) {
  const { data, error } = await admin.rpc("verifica_curricolo_uda_gestione_stati", {
    p_author_name: authorName,
  });
  return { manage_status: !error && data === true };
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://salvapicconi.github.io",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-curricolo-session",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8" },
  });
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function cleanString(value: unknown, max: number, required = false) {
  if (typeof value !== "string") {
    if (required) throw new Error("Campo obbligatorio non valido.");
    return "";
  }
  const result = value.trim();
  if (required && !result) throw new Error("Campo obbligatorio mancante.");
  if (result.length > max) throw new Error("Uno dei testi supera la lunghezza consentita.");
  return result;
}

function cleanObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  if (JSON.stringify(value).length > 200_000) throw new Error("La proposta è troppo grande.");
  return value as Record<string, unknown>;
}

// Ripartizione oraria: mappa insegnamento → ore concordate dal docente.
// Contiene solo gli scostamenti dalla proposta proporzionale, che arriva in
// `originale` e delimita la banda entro cui lo scostamento è ammesso.
function cleanHours(value: unknown, baseline: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Ripartizione oraria non valida.");
  }
  const hours = value as Record<string, unknown>;
  const entries = Object.entries(hours);
  if (entries.length > 30) throw new Error("Troppi insegnamenti nella ripartizione oraria.");
  const proposal = baseline && typeof baseline === "object" && !Array.isArray(baseline)
    ? baseline as Record<string, unknown>
    : {};
  for (const [subject, amount] of entries) {
    if (!subject.trim() || subject.length > 80) throw new Error("Insegnamento non valido nella ripartizione oraria.");
    const numero = Number(amount);
    if (!Number.isInteger(numero) || numero < 1 || numero > ORE_MASSIME_UDA) {
      throw new Error(`Ore non valide per ${subject}.`);
    }
    const base = Number(proposal[subject]);
    if (!Number.isFinite(base) || base <= 0) continue;
    const minimo = Math.max(1, Math.round(base * (1 - ORE_TOLLERANZA)));
    const massimo = Math.max(1, Math.round(base * (1 + ORE_TOLLERANZA)));
    if (numero < minimo || numero > massimo) {
      throw new Error(`Le ore di ${subject} devono restare fra ${minimo} e ${massimo}: la proposta proporzionale è di ${base} ore e lo scostamento consentito è del 40%.`);
    }
  }
  return hours;
}

function cleanChanges(value: unknown, baseline: unknown = {}) {
  const changes = cleanObject(value);
  for (const key of Object.keys(changes)) {
    if (!FIELDS.has(key)) throw new Error("La proposta contiene un campo non valido.");
  }
  for (const key of ["abilita", "saperi", "integrazioniSaperi"]) {
    if (key in changes && !Array.isArray(changes[key])) throw new Error("Elenco didattico non valido.");
  }
  for (const key of ["assi", "competenzeGenerali", "competenzeSSAS", "competenzeEuropee"]) {
    if (key in changes && !Array.isArray(changes[key])) throw new Error("Elenco trasversale non valido.");
  }
  if ("anno" in changes && (!Number.isInteger(Number(changes.anno)) || Number(changes.anno) < 1 || Number(changes.anno) > 5)) {
    throw new Error("Anno non valido.");
  }
  if ("competenza" in changes && (!Number.isInteger(Number(changes.competenza)) || Number(changes.competenza) < 1 || Number(changes.competenza) > 10)) {
    throw new Error("Competenza non valida.");
  }
  if ("competenzeGenerali" in changes && !(changes.competenzeGenerali as unknown[]).every(value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 12)) {
    throw new Error("Competenze dell’area generale non valide.");
  }
  if ("competenzeSSAS" in changes && !(changes.competenzeSSAS as unknown[]).every(value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 10)) {
    throw new Error("Competenze SSAS non valide.");
  }
  if ("qnq" in changes && !["2", "3", "3/4", "4"].includes(String(changes.qnq))) throw new Error("Livello QNQ non valido.");
  if ("oreRipartizione" in changes) {
    changes.oreRipartizione = cleanHours(
      changes.oreRipartizione,
      (baseline as Record<string, unknown>)?.oreRipartizione,
    );
  }
  return changes;
}

async function verifySession(request: Request) {
  const token = request.headers.get("x-curricolo-session") ?? "";
  if (token.length < 32 || token.length > 128) return null;
  const tokenHash = await sha256(token);
  const { data, error } = await admin.from("curricolo_uda_revision_sessions")
    .select("token_hash,expires_at,author_name")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data || !AUTHORS.has(data.author_name)) return null;
  void admin.from("curricolo_uda_revision_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);
  return data.author_name as string;
}

async function login(request: Request, payload: Record<string, unknown>) {
  const password = typeof payload.password === "string" ? payload.password : "";
  const authorName = cleanString(payload.author_name, 40);
  if (!password || password.length > 200) return json(request, { error: "Password non corretta." }, 401);
  if (!AUTHORS.has(authorName)) return json(request, { error: "Scegli chi sta lavorando." }, 400);
  const { data: valid, error } = await admin.rpc("verifica_curricolo_uda_password", { p_password: password });
  if (error || valid !== true) return json(request, { error: "Password non corretta." }, 401);
  const token = randomToken();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
  await admin.from("curricolo_uda_revision_sessions").delete().lt("expires_at", new Date().toISOString());
  const { error: insertError } = await admin.from("curricolo_uda_revision_sessions").insert({
    token_hash: tokenHash, author_name: authorName, expires_at: expiresAt,
  });
  if (insertError) return json(request, { error: "Accesso temporaneamente non disponibile." }, 503);
  return json(request, {
    ok: true, token, author_name: authorName, expires_at: expiresAt,
    permissions: await permissionsFor(authorName),
  });
}

async function listRevisions(request: Request) {
  const { data, error } = await admin.from("curricolo_uda_revisioni")
    .select("id,uda_key,author_name,anno,titolo_uda,originale,modifiche,nota_generale,stato,source_version,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) return json(request, { error: "Impossibile caricare le revisioni." }, 500);
  return json(request, { revisions: data ?? [] });
}

async function upsertRevision(request: Request, payload: Record<string, unknown>, sessionAuthor: string) {
  try {
    const record = cleanObject(payload.revision);
    const udaKey = cleanString(record.uda_key, 50, true);
    if (!/^([0-9]+\.[0-9]+|T[1-5]\.[0-9]+|FSL[3-5]\.[0-9]+|nuova-(t-|f-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(udaKey)) {
      throw new Error("Chiave UDA non valida.");
    }
    const authorName = cleanString(record.author_name, 40, true);
    if (!AUTHORS.has(authorName) || authorName !== sessionAuthor) throw new Error("Autore non valido per questa sessione.");
    const anno = Number(record.anno);
    if (!Number.isInteger(anno) || anno < 1 || anno > 5) throw new Error("Anno non valido.");
    const originale = cleanObject(record.originale);
    const changes = cleanChanges(record.modifiche, originale);
    if (udaKey.startsWith("nuova-f-")) {
      if (anno < 3 || Number(changes.anno) !== anno || !changes.qnq || !cleanString(changes.titolo, 500) ||
          !cleanString(changes.areaTirocinio, 500) || !(changes.competenzeSSAS as unknown[])?.length || !(changes.saperi as unknown[])?.length) {
        throw new Error("La nuova UDA FSL richiede anno dal terzo, livello QNQ, titolo, area, competenze SSAS e saperi documentali.");
      }
    } else if (udaKey.startsWith("nuova-t-")) {
      if (Number(changes.anno) !== anno || !changes.qnq || !cleanString(changes.titolo, 500) ||
          !(changes.assi as unknown[])?.length || !(changes.competenzeGenerali as unknown[])?.length || !(changes.competenzeSSAS as unknown[])?.length) {
        throw new Error("La nuova UDA trasversale richiede anno, livello QNQ, titolo, assi e competenze.");
      }
    } else if (udaKey.startsWith("nuova-")) {
      if (Number(changes.anno) !== anno || !changes.competenza || !changes.qnq || !cleanString(changes.titolo, 500)) {
        throw new Error("La nuova UDA richiede anno, competenza, livello QNQ e titolo.");
      }
    }
    const note = cleanString(record.nota_generale, 20_000);
    if (!note && !Object.keys(changes).length) throw new Error("Scrivi un’annotazione oppure modifica almeno un campo.");
    const { data: existing, error: existingError } = await admin.from("curricolo_uda_revisioni")
      .select("stato").eq("uda_key", udaKey).eq("author_name", authorName).maybeSingle();
    if (existingError) throw existingError;
    const permissions = await permissionsFor(sessionAuthor);
    if (!permissions.manage_status && existing && ["approvata", "applicata"].includes(String(existing.stato))) {
      throw new Error("La proposta è già stata validata e non può più essere modificata.");
    }
    const databaseRecord = {
      uda_key: udaKey, author_name: authorName, anno,
      titolo_uda: cleanString(record.titolo_uda, 500, true),
      originale, modifiche: changes,
      nota_generale: note,
      stato: STATES.has(String(record.stato)) ? String(record.stato) : "bozza",
      source_version: cleanString(record.source_version, 160) || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await admin.from("curricolo_uda_revisioni")
      .upsert(databaseRecord, { onConflict: "uda_key,author_name" })
      .select("id,uda_key,author_name,anno,titolo_uda,originale,modifiche,nota_generale,stato,source_version,created_at,updated_at")
      .single();
    if (error) throw error;
    return json(request, { revision: data });
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : "Proposta non valida." }, 400);
  }
}

async function updateStatus(request: Request, payload: Record<string, unknown>, sessionAuthor: string) {
  const id = cleanString(payload.id, 50, true);
  const state = cleanString(payload.state, 20, true);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !STATES.has(state)) return json(request, { error: "Aggiornamento non valido." }, 400);
  const permissions = await permissionsFor(sessionAuthor);
  if (!permissions.manage_status && !["bozza", "archiviata"].includes(state)) {
    return json(request, { error: "Operazione non consentita." }, 403);
  }
  let query = admin.from("curricolo_uda_revisioni")
    .update({ stato: state, updated_at: new Date().toISOString() }).eq("id", id);
  if (!permissions.manage_status) query = query.eq("author_name", sessionAuthor).in("stato", ["bozza", "archiviata"]);
  const { data, error } = await query
    .select("id,uda_key,author_name,anno,titolo_uda,originale,modifiche,nota_generale,stato,source_version,created_at,updated_at")
    .single();
  if (error) return json(request, { error: "Impossibile aggiornare lo stato." }, 500);
  return json(request, { revision: data });
}

// Voti e scelta ufficiale, restituiti insieme: al client servono sempre
// entrambi per disegnare la classifica.
async function listVotes(request: Request) {
  const [voti, scelte] = await Promise.all([
    admin.from("curricolo_uda_voti").select("uda_key,author_name,anno,genere"),
    admin.from("curricolo_uda_scelte").select("anno,genere,uda_keys,confermata_da,updated_at"),
  ]);
  if (voti.error || scelte.error) return json(request, { error: "Impossibile caricare i voti." }, 500);
  return json(request, { votes: voti.data ?? [], choices: scelte.data ?? [] });
}

async function castVote(request: Request, payload: Record<string, unknown>, sessionAuthor: string) {
  try {
    const udaKey = cleanString(payload.uda_key, 50, true);
    if (!CHIAVE_VOTABILE.test(udaKey)) throw new Error("Su questa UDA non si vota.");
    const anno = Number(payload.anno);
    if (!Number.isInteger(anno) || anno < 1 || anno > 5) throw new Error("Anno non valido.");
    const genere = cleanString(payload.genere, 20, true);
    if (!GENERI_UDA.has(genere)) throw new Error("Genere di UDA non valido.");
    const rimuovi = payload.rimuovi === true;

    if (rimuovi) {
      const { error } = await admin.from("curricolo_uda_voti").delete()
        .eq("uda_key", udaKey).eq("author_name", sessionAuthor);
      if (error) throw error;
      return await listVotes(request);
    }

    // Il tetto si verifica qui, non nel database: il messaggio deve dire al
    // docente quanti voti ha e come liberarne uno.
    const { data: spesi, error: erroreConteggio } = await admin.from("curricolo_uda_voti")
      .select("uda_key").eq("author_name", sessionAuthor).eq("anno", anno).eq("genere", genere);
    if (erroreConteggio) throw erroreConteggio;
    const giaVotata = (spesi ?? []).some(voce => voce.uda_key === udaKey);
    if (!giaVotata && (spesi ?? []).length >= VOTI_PER_DOCENTE) {
      const elenco = (spesi ?? []).map(voce => voce.uda_key).join(" e ");
      throw new Error(
        `Hai già usato i tuoi ${VOTI_PER_DOCENTE} voti di ${anno}ª su ${elenco}. Togli un voto per spostarlo su un'altra UDA.`,
      );
    }
    const { error } = await admin.from("curricolo_uda_voti")
      .upsert({ uda_key: udaKey, author_name: sessionAuthor, anno, genere }, { onConflict: "uda_key,author_name" });
    if (error) throw error;
    return await listVotes(request);
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : "Voto non registrato." }, 400);
  }
}

// La classifica è consultiva: solo chi ha i permessi di gestione la trasforma
// nella scelta ufficiale dell'anno.
async function confirmChoice(request: Request, payload: Record<string, unknown>, sessionAuthor: string) {
  try {
    const permissions = await permissionsFor(sessionAuthor);
    if (!permissions.manage_status) return json(request, { error: "Operazione non consentita." }, 403);
    const anno = Number(payload.anno);
    if (!Number.isInteger(anno) || anno < 1 || anno > 5) throw new Error("Anno non valido.");
    const genere = cleanString(payload.genere, 20, true);
    if (!GENERI_UDA.has(genere)) throw new Error("Genere di UDA non valido.");
    const chiavi = Array.isArray(payload.uda_keys) ? payload.uda_keys.map(String) : [];
    if (chiavi.length > VOTI_PER_DOCENTE) throw new Error(`Si scelgono al massimo ${VOTI_PER_DOCENTE} UDA per anno.`);
    if (chiavi.some(chiave => !CHIAVE_VOTABILE.test(chiave))) throw new Error("Chiave UDA non valida.");
    if (new Set(chiavi).size !== chiavi.length) throw new Error("La stessa UDA compare due volte.");
    const { error } = await admin.from("curricolo_uda_scelte").upsert({
      anno, genere, uda_keys: chiavi, confermata_da: sessionAuthor, updated_at: new Date().toISOString(),
    }, { onConflict: "anno,genere" });
    if (error) throw error;
    return await listVotes(request);
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : "Scelta non registrata." }, 400);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Metodo non consentito." }, 405);
  let payload: Record<string, unknown>;
  try { payload = await request.json(); }
  catch { return json(request, { error: "Richiesta non valida." }, 400); }
  const action = typeof payload.action === "string" ? payload.action : "";
  if (action === "login") return await login(request, payload);
  const sessionAuthor = await verifySession(request);
  if (!sessionAuthor) return json(request, { error: "Sessione scaduta. Accedi di nuovo." }, 401);
  if (action === "session") {
    return json(request, { ok: true, author_name: sessionAuthor, permissions: await permissionsFor(sessionAuthor) });
  }
  if (action === "list") return await listRevisions(request);
  if (action === "upsert") return await upsertRevision(request, payload, sessionAuthor);
  if (action === "status") return await updateStatus(request, payload, sessionAuthor);
  if (action === "votes") return await listVotes(request);
  if (action === "vote") return await castVote(request, payload, sessionAuthor);
  if (action === "choice") return await confirmChoice(request, payload, sessionAuthor);
  if (action === "logout") {
    const token = request.headers.get("x-curricolo-session") ?? "";
    if (token) await admin.from("curricolo_uda_revision_sessions").delete().eq("token_hash", await sha256(token));
    return json(request, { ok: true });
  }
  return json(request, { error: "Azione non riconosciuta." }, 400);
});

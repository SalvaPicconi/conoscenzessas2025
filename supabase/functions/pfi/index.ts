// ============================================================
// PFI — API del prototipo dimostrativo
//
// ACCESSO: registrazione automatica. Al primo accesso il docente sceglie
// nome e codice e l'utenza viene creata; agli accessi successivi il codice
// viene verificato. Chi è dentro può aprire e modificare qualsiasi PFI: il
// codice serve a firmare le modifiche, non a limitare l'accesso.
//
// Il PFI è un documento della CLASSE:
//   · la classe è creata dal tutor alla prima compilazione
//   · l'archiviazione è reversibile; la cancellazione definitiva richiede
//     di ridigitare il codice e il nome dello studente
//
// Le tabelle pfi_* hanno RLS chiusa senza policy permissive: questa
// funzione, che gira con la service role, è l'unico accesso.
//
// Rotte (POST), token di sessione nell'header x-pfi-token:
//   /pfi/login      { docente, codice }        -> { token, docente, nomeCompleto, nuovo }
//   /pfi/session    {}                         -> { docente, nomeCompleto }
//   /pfi/classi     {}                         -> { classi: [...] }
//   /pfi/salva      { classe, anno_scolastico, tutor, etichetta, payload }
//   /pfi/elenco     { classe_id?, archiviati? } -> { documenti: [...] }
//   /pfi/apri       { id }
//   /pfi/archivia   { id, ripristina? }
//   /pfi/elimina    { id, codice, conferma }
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pfi-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

type Docente = {
  id: string;
  nome: string;
  nome_completo: string | null;
  codice_hash?: string;
  attivo: boolean;
};

async function sha256(testo: string): Promise<string> {
  const dati = new TextEncoder().encode(testo);
  const digest = await crypto.subtle.digest('SHA-256', dati);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const risposta = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), {
    status: stato,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const errore = (messaggio: string, stato = 400) => risposta({ error: messaggio }, stato);

const profilo = (d: Docente) => ({
  docente: d.nome,
  nomeCompleto: d.nome_completo || d.nome,
});

const normalizza = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');

async function docenteDaToken(token: string): Promise<Docente | null> {
  if (!token) return null;
  const hash = await sha256(token);
  const { data } = await admin
    .from('pfi_sessioni')
    .select('id, scade_il, pfi_docenti ( id, nome, nome_completo, attivo )')
    .eq('token_hash', hash)
    .maybeSingle();

  if (!data) return null;
  if (new Date(data.scade_il) < new Date()) {
    await admin.from('pfi_sessioni').delete().eq('id', data.id);
    return null;
  }
  const d = data.pfi_docenti as unknown as Docente | null;
  return d && d.attivo ? d : null;
}

async function apriSessione(docenteId: string): Promise<string> {
  const token = crypto.randomUUID() + '.' + crypto.randomUUID();
  await admin.from('pfi_sessioni').insert({
    docente_id: docenteId,
    token_hash: await sha256(token),
  });
  await admin.from('pfi_sessioni').delete().lt('scade_il', new Date().toISOString());
  return token;
}

/** Trova la classe o la crea: il tutor la assegna alla prima compilazione. */
async function classePerNome(nome: string, anno: string, tutor: string, docenteId: string) {
  const { data: esistente } = await admin
    .from('pfi_classi')
    .select('id, nome, anno_scolastico, tutor')
    .ilike('nome', nome)
    .eq('anno_scolastico', anno)
    .maybeSingle();

  if (esistente) {
    if (!esistente.tutor && tutor) {
      await admin.from('pfi_classi').update({ tutor }).eq('id', esistente.id);
    }
    return esistente;
  }

  const { data, error } = await admin
    .from('pfi_classi')
    .insert({ nome, anno_scolastico: anno, tutor, creata_da: docenteId })
    .select('id, nome, anno_scolastico, tutor')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return errore('Metodo non consentito', 405);

  const azione = new URL(req.url).pathname.split('/').filter(Boolean).pop() ?? '';
  let corpo: Record<string, unknown> = {};
  try {
    corpo = await req.json();
  } catch {
    corpo = {};
  }

  try {
    // ---------------- accesso, con registrazione automatica ----------------
    if (azione === 'login') {
      const nome = String(corpo.docente ?? '').trim().replace(/\s+/g, ' ');
      const codice = String(corpo.codice ?? '');

      if (nome.length < 3) return errore('Scrivi nome e cognome (almeno 3 caratteri).');
      if (codice.length < 4) return errore('Il codice deve avere almeno 4 caratteri.');

      const hash = await sha256(codice);

      const { data: docente } = await admin
        .from('pfi_docenti')
        .select('id, nome, nome_completo, codice_hash, attivo')
        .ilike('nome', nome)
        .maybeSingle();

      // primo accesso: l'utenza si crea da sé
      if (!docente) {
        const { data: creato, error } = await admin
          .from('pfi_docenti')
          .insert({ nome, nome_completo: nome, codice_hash: hash, attivo: true })
          .select('id, nome, nome_completo, attivo')
          .single();

        if (error) {
          // due registrazioni simultanee sullo stesso nome
          return errore('Nome già in uso: riprova con il codice che hai scelto.', 409);
        }

        const token = await apriSessione(creato.id);
        return risposta({ token, ...profilo(creato as unknown as Docente), nuovo: true });
      }

      if (!docente.attivo) return errore('Utenza disattivata.', 401);
      if (hash !== docente.codice_hash) {
        return errore('Codice non valido. Se è il tuo primo accesso, controlla il nome.', 401);
      }

      const token = await apriSessione(docente.id);
      return risposta({ token, ...profilo(docente as unknown as Docente), nuovo: false });
    }

    // ---------------- rotte autenticate ----------------
    const docente = await docenteDaToken(req.headers.get('x-pfi-token') ?? '');
    if (!docente) return errore('Sessione non valida o scaduta.', 401);

    if (azione === 'session') return risposta(profilo(docente));

    if (azione === 'classi') {
      const { data: classi, error } = await admin
        .from('pfi_classi')
        .select('id, nome, anno_scolastico, tutor')
        .order('nome', { ascending: true });
      if (error) return errore(error.message, 500);

      const { data: docs } = await admin
        .from('pfi_documenti')
        .select('classe_id, archiviato');

      const conteggio = new Map<string, number>();
      (docs ?? []).forEach((d) => {
        if (d.archiviato) return;
        conteggio.set(d.classe_id, (conteggio.get(d.classe_id) ?? 0) + 1);
      });

      return risposta({
        classi: (classi ?? []).map((c) => ({ ...c, studenti: conteggio.get(c.id) ?? 0 })),
      });
    }

    if (azione === 'salva') {
      const etichetta = String(corpo.etichetta ?? '').trim();
      const nomeClasse = String(corpo.classe ?? '').trim();
      const anno = String(corpo.anno_scolastico ?? '').trim();
      const tutor = String(corpo.tutor ?? '').trim();
      const payload = corpo.payload;

      if (!etichetta) return errore('Indica cognome e nome dello studente prima di salvare.');
      if (!nomeClasse) return errore('Assegna la classe prima di salvare.');
      if (!payload || typeof payload !== 'object') return errore('Payload non valido.');

      const classe = await classePerNome(nomeClasse, anno, tutor, docente.id);

      const { data: esistente } = await admin
        .from('pfi_documenti')
        .select('id')
        .eq('classe_id', classe.id)
        .ilike('etichetta', etichetta)
        .maybeSingle();

      const record = {
        etichetta,
        classe: classe.nome,
        classe_id: classe.id,
        anno_scolastico: anno,
        payload,
        demo: true,
        aggiornato_da: docente.id,
        archiviato: false,
      };

      const { data, error } = esistente
        ? await admin.from('pfi_documenti').update(record).eq('id', esistente.id)
            .select('id, aggiornato_il').single()
        : await admin.from('pfi_documenti').insert({ ...record, creato_da: docente.id })
            .select('id, aggiornato_il').single();

      if (error) return errore(error.message, 500);
      return risposta({
        id: data.id,
        aggiornato_il: data.aggiornato_il,
        classe: classe.nome,
        creato: !esistente,
      });
    }

    if (azione === 'elenco') {
      const classeId = String(corpo.classe_id ?? '').trim();
      const archiviati = corpo.archiviati === true;

      let query = admin
        .from('pfi_documenti')
        .select('id, etichetta, classe, classe_id, anno_scolastico, aggiornato_il, archiviato, ' +
                'creatore:creato_da ( nome_completo, nome ), ' +
                'ultimo:aggiornato_da ( nome_completo, nome )')
        .eq('archiviato', archiviati);

      if (classeId) query = query.eq('classe_id', classeId);

      const { data, error } = await query
        .order('classe', { ascending: true })
        .order('etichetta', { ascending: true });

      if (error) return errore(error.message, 500);

      return risposta({
        documenti: (data ?? []).map((d) => ({
          id: d.id,
          etichetta: d.etichetta,
          classe: d.classe,
          classe_id: d.classe_id,
          anno_scolastico: d.anno_scolastico,
          aggiornato_il: d.aggiornato_il,
          archiviato: d.archiviato,
          // deno-lint-ignore no-explicit-any
          creato_da: (d as any).creatore?.nome_completo ?? (d as any).creatore?.nome ?? '',
          // deno-lint-ignore no-explicit-any
          aggiornato_da: (d as any).ultimo?.nome_completo ?? (d as any).ultimo?.nome ?? '',
        })),
      });
    }

    if (azione === 'apri') {
      const id = String(corpo.id ?? '');
      if (!id) return errore('Identificativo mancante.');
      const { data, error } = await admin
        .from('pfi_documenti')
        .select('id, etichetta, classe, classe_id, anno_scolastico, payload, archiviato')
        .eq('id', id)
        .maybeSingle();

      if (error) return errore(error.message, 500);
      if (!data) return errore('Documento non trovato.', 404);
      return risposta(data);
    }

    if (azione === 'archivia') {
      const id = String(corpo.id ?? '');
      if (!id) return errore('Identificativo mancante.');
      const ripristina = corpo.ripristina === true;

      const { error } = await admin
        .from('pfi_documenti')
        .update({
          archiviato: !ripristina,
          archiviato_il: ripristina ? null : new Date().toISOString(),
          archiviato_da: ripristina ? null : docente.id,
          aggiornato_da: docente.id,
        })
        .eq('id', id);

      if (error) return errore(error.message, 500);
      return risposta({ ok: true, archiviato: !ripristina });
    }

    if (azione === 'elimina') {
      const id = String(corpo.id ?? '');
      const codice = String(corpo.codice ?? '');
      const conferma = String(corpo.conferma ?? '');
      if (!id) return errore('Identificativo mancante.');

      const { data: d } = await admin
        .from('pfi_docenti')
        .select('codice_hash')
        .eq('id', docente.id)
        .maybeSingle();
      if (!d || (await sha256(codice)) !== d.codice_hash) {
        return errore('Codice non valido: la cancellazione non è stata eseguita.', 401);
      }

      const { data: doc } = await admin
        .from('pfi_documenti')
        .select('id, etichetta, archiviato')
        .eq('id', id)
        .maybeSingle();
      if (!doc) return errore('Documento non trovato.', 404);
      if (normalizza(conferma) !== normalizza(doc.etichetta)) {
        return errore(`Per cancellare, riscrivi esattamente «${doc.etichetta}».`);
      }
      if (!doc.archiviato) {
        return errore('Archivia il PFI prima di cancellarlo definitivamente.');
      }

      const { error } = await admin.from('pfi_documenti').delete().eq('id', id);
      if (error) return errore(error.message, 500);
      return risposta({ ok: true, eliminato: doc.etichetta });
    }

    return errore('Azione sconosciuta.', 404);
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500);
  }
});

// Validazione indipendente e verificabile; nessuna annualità/competenza fittizia.
export function validaIdea(value: unknown) {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Proposta non valida.');
 const input = value as Record<string, unknown>;
 const campo = (nome: string, massimo: number, obbligatorio = false) => {
  if (typeof input[nome] !== 'string') throw new Error(`Campo ${nome} non valido.`);
  const testo = (input[nome] as string).trim();
  if ((obbligatorio && !testo) || testo.length > massimo) throw new Error(`Controlla il campo ${nome}.`);
  return testo;
 };
 const id = campo('id',36,true);
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Identificativo non valido.');
 const versione = input.versione;
 if (!Number.isSafeInteger(versione) || Number(versione)<0) throw new Error('Versione non valida.');
 const modalita = campo('modalita',30,true);
 if (!['individuale','trasversale','da concordare'].includes(modalita)) throw new Error('Modalità non valida.');
 return { id, versione: Number(versione), titolo:campo('titolo',300,true), profilo:campo('profilo',3000),
  descrizione:campo('descrizione',12000,true), attualita:campo('attualita',5000), modalita, collegamenti:campo('collegamenti',5000) };
}

/* =====================================================================
   Testes do motor de interações (node --test)
   Corre com:  node --test
   ---------------------------------------------------------------------
   Cobre: regressão dos mecanismos graduados (QT, CYP3A4, serotonina,
   nó AV, INR, potássio, sódio), as deduplicações, e os falsos positivos
   que foram corrigidos nas rondas de revisão clínica.
   Cada caso aqui corresponde a uma decisão clínica validada — ver
   CHANGELOG-clinico.md. Se um destes quebrar, é uma regressão real.
   ===================================================================== */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cat = readFileSync(join(root, "js/catalog.js"), "utf8");
const eng = readFileSync(join(root, "js/engine.js"), "utf8")
  .replace(/if \(typeof module[\s\S]*$/, "");   // tirar o guard de export

const { CATALOG, analyze, RULE_META, RULEBASE } = new Function(
  `${cat}\n${eng}\nreturn { CATALOG, analyze, RULE_META, RULEBASE };`
)();

/* --- utilitários --- */
const byName = {};
CATALOG.forEach(c => c.s.forEach(s => (byName[s.d.toLowerCase()] = { d: s.d, p: s.p })));

const lista = (...nomes) => nomes.map(n => {
  const s = byName[n.toLowerCase()];
  if (!s) throw new Error(`substância não existe no catálogo: ${n}`);
  return s;
});

/** severidade do achado que liga dois fármacos (ou null) */
const sevPar = (nomes, a, b) => {
  const f = analyze(lista(...nomes)).find(x =>
    (x.a === a && x.b === b) || (x.a === b && x.b === a));
  return f ? f.sev : null;
};
/** nº de achados que ligam dois fármacos — para testar deduplicação */
const nPar = (nomes, a, b) => analyze(lista(...nomes)).filter(x =>
  (x.a === a && x.b === b) || (x.a === b && x.b === a)).length;

/** achado ao nível da lista inteira (b vazio), pelo início do mecanismo */
const temLista = (nomes, inicioMech) =>
  analyze(lista(...nomes)).some(x => !x.b && x.mech.startsWith(inicioMech));

/** severidade do achado entre dois fármacos cujo mecanismo começa por X (ou null) */
const sevMech = (nomes, a, b, inicioMech) => {
  const f = analyze(lista(...nomes)).find(x =>
    ((x.a === a && x.b === b) || (x.a === b && x.b === a)) && x.mech.startsWith(inicioMech));
  return f ? f.sev : null;
};

/* ===================================================================
   PROVENIÊNCIA — nenhuma regra pode existir sem fonte e nível de evidência.
   Este bloco é o que torna a base defensável perante um farmacologista
   ou um regulador. Se falhar, alguém acrescentou uma regra sem a sustentar.
   =================================================================== */
const NIVEIS = ["consenso", "provável", "incerto"];

test("proveniência: a base de regras tem versão e data", () => {
  assert.match(RULEBASE.version, /^\d+\.\d+\.\d+$/);
  assert.match(RULEBASE.date, /^\d{4}-\d{2}-\d{2}$/);
});

test("proveniência: toda a regra do motor tem fonte e nível de evidência", () => {
  const ids = [...new Set([
    ...eng.matchAll(/push\("([a-z0-9_]+)"/g),
    ...eng.matchAll(/id: "([a-z0-9_]+)"/g),
  ].map(m => m[1]))];
  assert.ok(ids.length >= 40, "esperava pelo menos 40 regras identificadas");
  const semMeta = ids.filter(i => !RULE_META[i]);
  assert.deepEqual(semMeta, [], `regras sem proveniência: ${semMeta.join(", ")}`);
});

test("proveniência: não há metadados órfãos (regra removida, fonte esquecida)", () => {
  const ids = new Set([
    ...eng.matchAll(/push\("([a-z0-9_]+)"/g),
    ...eng.matchAll(/id: "([a-z0-9_]+)"/g),
  ].map(m => m[1]));
  const orfas = Object.keys(RULE_META).filter(k => !ids.has(k));
  assert.deepEqual(orfas, [], `metadados sem regra: ${orfas.join(", ")}`);
});

test("proveniência: os níveis de evidência são do vocabulário permitido", () => {
  for (const [id, m] of Object.entries(RULE_META)) {
    assert.ok(m.src && m.src.length > 3, `regra ${id} sem fonte`);
    assert.ok(NIVEIS.includes(m.ev), `regra ${id} com nível inválido: ${m.ev}`);
  }
});

test("proveniência: a fonte viaja com o achado, não fica num documento ao lado", () => {
  const f = analyze(lista("Claritromicina", "Sinvastatina"))
    .find(x => x.id === "cyp3a4_estatina");
  assert.equal(f.sev, "major");
  assert.match(f.src, /FDA/);
  assert.equal(f.ev, "consenso");
  assert.equal(f.rulebase, RULEBASE.version);
});

/* ===================================================================
   Catálogo
   =================================================================== */
test("catálogo: sem substâncias duplicadas", () => {
  const atcs = CATALOG.flatMap(c => c.s.map(s => s.a));
  assert.equal(new Set(atcs).size, atcs.length);
});

test("catálogo: ranitidina foi removida (retirada do mercado, 2020)", () => {
  assert.ok(!byName["ranitidina"]);
});

/* ===================================================================
   QT — graduado por nível de evidência (CredibleMeds)
   =================================================================== */
test("QT: dois de evidência estabelecida = maior", () => {
  assert.equal(sevPar(["Amiodarona", "Claritromicina"], "Amiodarona", "Claritromicina"), "major");
});

test("QT: dois condicionais isolados NÃO disparam QT (falso positivo corrigido)", () => {
  // dois tricíclicos: não deve haver achado de QT...
  assert.equal(sevMech(["Amitriptilina", "Nortriptilina"], "Amitriptilina", "Nortriptilina",
                       "Prolongamento aditivo"), null);
  // ...mas a carga anticolinérgica aditiva é real e deve disparar
  assert.equal(sevMech(["Amitriptilina", "Nortriptilina"], "Amitriptilina", "Nortriptilina",
                       "Carga anticolinérgica"), "moderate");
});

test("QT: condicional + condicional COM hipocaliemia escala para moderada", () => {
  assert.equal(sevMech(["Amitriptilina", "Nortriptilina", "Furosemida"],
                       "Amitriptilina", "Nortriptilina", "Prolongamento aditivo"), "moderate");
});

/* ===================================================================
   CYP3A4 — por potência do inibidor × tipo de substrato
   =================================================================== */
test("CYP3A4: inibidor potente + estatina 3A4 = maior (rabdomiólise)", () => {
  assert.equal(sevPar(["Claritromicina", "Sinvastatina"], "Claritromicina", "Sinvastatina"), "major");
});

test("CYP3A4: inibidor moderado + estatina = moderada", () => {
  assert.equal(sevPar(["Amiodarona", "Sinvastatina"], "Amiodarona", "Sinvastatina"), "moderate");
});

test("DOAC + inibidor 3A4/P-gp: um único cartão (deduplicado)", () => {
  assert.equal(nPar(["Apixabano", "Claritromicina"], "Apixabano", "Claritromicina"), 1);
});

/* ===================================================================
   Serotonina — forte / fraco / menor
   =================================================================== */
test("serotonina: forte + forte = maior", () => {
  assert.equal(sevPar(["Sertralina", "Tramadol"], "Sertralina", "Tramadol"), "major");
});

test("serotonina: forte + fraco = moderada", () => {
  assert.equal(sevPar(["Sumatriptano", "Tramadol"], "Sumatriptano", "Tramadol"), "moderate");
});

test("serotonina: fraco + fraco = menor", () => {
  assert.equal(sevPar(["Sumatriptano", "Trazodona"], "Sumatriptano", "Trazodona"), "minor");
});

/* ===================================================================
   Nó AV — potente vs simples
   =================================================================== */
test("nó AV: BCC não di-hidropiridínico + beta-bloqueante = maior", () => {
  assert.equal(sevPar(["Verapamil", "Bisoprolol"], "Verapamil", "Bisoprolol"), "major");
});

test("nó AV: digoxina + beta-bloqueante = moderada (associação de guideline na FA)", () => {
  assert.equal(sevPar(["Digoxina", "Bisoprolol"], "Digoxina", "Bisoprolol"), "moderate");
});

test("digitálico + inibidor da P-gp = maior, num só cartão", () => {
  assert.equal(sevPar(["Digoxina", "Amiodarona"], "Digoxina", "Amiodarona"), "major");
  assert.equal(nPar(["Digoxina", "Amiodarona"], "Digoxina", "Amiodarona"), 1);
});

/* ===================================================================
   INR / varfarina — graduado
   =================================================================== */
test("INR: inibidor potente (metronidazol) + varfarina = maior", () => {
  assert.equal(sevPar(["Metronidazol", "Varfarina"], "Metronidazol", "Varfarina"), "major");
});

test("INR: macrólido + varfarina = moderada", () => {
  assert.equal(sevPar(["Claritromicina", "Varfarina"], "Claritromicina", "Varfarina"), "moderate");
});

test("INR: carbamazepina + varfarina num só cartão (dedup com o indutor 3A4)", () => {
  assert.equal(nPar(["Carbamazepina", "Varfarina"], "Carbamazepina", "Varfarina"), 1);
});

/* ===================================================================
   Eletrólitos
   =================================================================== */
test("potássio: dois agentes que retêm K+ = maior", () => {
  assert.equal(sevPar(["Enalapril", "Espironolactona"], "Enalapril", "Espironolactona"), "major");
});

test("triplo whammy: AINE + IECA/ARA + diurético = achado de lista, maior", () => {
  const f = analyze(lista("Ibuprofeno", "Enalapril", "Furosemida")).find(x => !x.b);
  assert.equal(f.sev, "major");
  assert.ok(f.mech.startsWith("Triplo whammy"));
});

test("sódio: dois agentes = moderada por par", () => {
  assert.equal(sevPar(["Sertralina", "Indapamida"], "Sertralina", "Indapamida"), "moderate");
});

test("sódio: >= 3 agentes = um achado maior de lista (sem moderadas repetidas)", () => {
  const nomes = ["Sertralina", "Indapamida", "Carbamazepina"];
  assert.ok(temLista(nomes, "Risco cumulativo de hiponatremia"));
  assert.equal(sevPar(nomes, "Sertralina", "Indapamida"), null);   // par suprimido
});

/* ===================================================================
   Falsos positivos corrigidos nas rondas de revisão
   =================================================================== */
test("CYP2D6 só dispara com substrato real (fluoxetina + atenolol = nada)", () => {
  assert.equal(sevPar(["Fluoxetina", "Atenolol"], "Fluoxetina", "Atenolol"), null);
});

test("CYP2D6 dispara com metoprolol (substrato)", () => {
  assert.equal(sevPar(["Fluoxetina", "Metoprolol"], "Fluoxetina", "Metoprolol"), "moderate");
});

test("CYP2C9 só dispara com sulfonilureia (fluconazol + insulina = nada)", () => {
  assert.equal(sevPar(["Fluconazol", "Insulina glargina"], "Fluconazol", "Insulina glargina"), null);
});

test("CYP2C9 + gliclazida = moderada", () => {
  assert.equal(sevPar(["Fluconazol", "Gliclazida"], "Fluconazol", "Gliclazida"), "moderate");
});

/* ===================================================================
   Outras regras de segurança
   =================================================================== */
test("genfibrozil + estatina = maior (fenofibrato seria moderada)", () => {
  assert.equal(sevPar(["Genfibrozil", "Sinvastatina"], "Genfibrozil", "Sinvastatina"), "major");
  assert.equal(sevPar(["Fenofibrato", "Sinvastatina"], "Fenofibrato", "Sinvastatina"), "moderate");
});

test("opioide + benzodiazepina = maior", () => {
  assert.equal(sevPar(["Morfina", "Diazepam"], "Morfina", "Diazepam"), "major");
});

test("opioide + gabapentinoide = maior (aviso FDA 2019)", () => {
  assert.equal(sevPar(["Morfina", "Pregabalina"], "Morfina", "Pregabalina"), "major");
});

test("alopurinol + azatioprina = maior (xantina-oxidase + tiopurina)", () => {
  assert.equal(sevPar(["Alopurinol", "Azatioprina"], "Alopurinol", "Azatioprina"), "major");
});

test("nitrato + inibidor da PDE5 = maior (contraindicado)", () => {
  assert.equal(sevPar(["Mononitrato de isossorbida", "Sildenafil"], "Mononitrato de isossorbida", "Sildenafil"), "major");
});

test("gliflozina + diurético = moderada (depleção de volume)", () => {
  assert.equal(sevPar(["Dapagliflozina", "Furosemida"], "Dapagliflozina", "Furosemida"), "moderate");
});

/* ===================================================================
   Ordenação
   =================================================================== */
test("achados vêm ordenados por severidade (maiores primeiro)", () => {
  const r = analyze(lista("Amiodarona", "Sinvastatina", "Bisoprolol", "Ibuprofeno",
                          "Enalapril", "Espironolactona", "Furosemida", "Sertralina", "Tramadol"));
  const rank = { major: 0, moderate: 1, minor: 2 };
  for (let i = 1; i < r.length; i++) {
    assert.ok(rank[r[i - 1].sev] <= rank[r[i].sev], "ordem de severidade quebrada");
  }
});

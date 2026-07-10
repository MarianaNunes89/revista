/* =====================================================================
   Revista — motor de interações por mecanismo (baseado em propriedades)
   ---------------------------------------------------------------------
   Em vez de regras par-a-par (que não escalam: 192 substâncias = ~18.000
   pares), cada substância traz PROPRIEDADES de mecanismo (ver catalog.js)
   e ~24 regras genéricas disparam quando duas propriedades se cruzam.
   Assim, um punhado de regras cobre milhares de pares automaticamente.

   analyze(subs) -> lista de interações {a, b, sev, mech, act}
     subs: array de substâncias, cada uma { d: nome, p: [propriedades] }

   Ilustrativo e não exaustivo. Não substitui o juízo clínico.
   ===================================================================== */

/* etiquetas legíveis das propriedades (para a interface) */
const PROP_LABELS = {
  qt_known: "prolonga o QT (evidência estabelecida)", qt_possible: "prolonga o QT (possível)",
  qt_cond: "prolonga o QT (condicional)",
  cyp3a4i_forte: "inibidor potente do CYP3A4", cyp3a4i_mod: "inibidor moderado do CYP3A4",
  cyp3a4s: "substrato CYP3A4", cyp3a4s_estreito: "substrato CYP3A4 (índice estreito)",
  cyp3a4ind: "indutor CYP3A4", estatina: "estatina", estatina3a4: "estatina (via CYP3A4)",
  cyp2c19i: "inibidor CYP2C19", cyp2d6i: "inibidor CYP2D6",
  cyp1a2i: "inibidor CYP1A2", cyp1a2s: "substrato CYP1A2", cyp2c9i: "inibidor CYP2C9",
  inr_down: "reduz o INR (indutor)", xantina_oxidase_i: "inibidor da xantina-oxidase",
  tiopurina: "tiopurina", metotrexato: "metotrexato",
  quelacao_cationica: "absorção reduzida por catiões", catiao: "catião (ferro/cálcio)",
  trimetoprim: "trimetoprim", cyp2d6s: "substrato CYP2D6", dissulfiram: "reação dissulfiram com álcool",
  seroton_forte: "serotoninérgico (forte)", seroton_fraco: "serotoninérgico (fraco)",
  sulfonilureia: "sulfonilureia", ccb_nondhp: "BCC não di-hidropiridínico",
  avnode: "deprime o nó AV", avnode_forte: "deprime o nó AV (potente)", bbloq: "beta-bloqueante",
  colinergico: "colinérgico", anticoag: "anticoagulante", avk: "antagonista da vit. K",
  antiagreg: "antiagregante", clopidogrel: "clopidogrel", aine: "AINE", gi: "risco de úlcera/GI",
  isrs_hemorr: "risco hemorrágico (ISRS)", inr_up: "aumenta o INR", inr_up_forte: "aumenta muito o INR",
  hiponatremia: "risco de hiponatremia",
  kup: "retém potássio", kdown: "baixa o potássio", ieca_ara: "bloqueio do SRAA",
  diur: "diurético", litio: "lítio", digital: "digitálico",
  pgpi: "inibidor da P-gp", pgps: "substrato da P-gp",
  snc: "depressor do SNC", opioide: "opioide", benzo: "benzodiazepina",
  anticol: "anticolinérgico", nitrato: "nitrato", pde5: "inibidor da PDE5",
  alfa1blq: "alfa-bloqueante", hipoglic: "risco de hipoglicemia",
  hipergli: "aumenta a glicemia", disglic: "disglicemia", fibrato: "fibrato", tca: "tricíclico",
  sglt2: "inibidor do SGLT2 (gliflozina)",
  corticoide: "corticosteroide", valproato: "valproato (inibidor enzimático)",
  gabapentinoide: "gabapentinoide", fibrato_alto: "fibrato de alto risco (genfibrozil)",
  colchicina: "colchicina", carbamazepina: "carbamazepina", lamotrigina: "lamotrigina",
};

const SEV_RANK = { major: 0, moderate: 1, minor: 2 };

function analyze(subs) {
  const out = [];
  const has = p => subs.some(s => s.p.includes(p));
  const kdownList = has("kdown");                       // hipocaliemia agrava o QT
  const hipoNa = subs.filter(s => s.p.includes("hiponatremia")).length; // carga de hiponatremia
  const qtLevel = s => s.p.includes("qt_known") ? 3
                     : s.p.includes("qt_possible") ? 2
                     : s.p.includes("qt_cond") ? 1 : 0;
  const serLevel = s => s.p.includes("seroton_forte") ? 2
                      : s.p.includes("seroton_fraco") ? 1 : 0;

  for (let i = 0; i < subs.length; i++) {
    for (let j = i + 1; j < subs.length; j++) {
      const A = subs[i], B = subs[j];
      const both = (x, y) =>
        (A.p.includes(x) && B.p.includes(y)) || (A.p.includes(y) && B.p.includes(x));
      const same = x => A.p.includes(x) && B.p.includes(x);
      const push = (sev, mech, act) => out.push({ a: A.d, b: B.d, sev, mech, act });

      // --- QT calibrado por nível de evidência (CredibleMeds) ---
      const la = qtLevel(A), lb = qtLevel(B);
      if (la && lb) {
        const sum = la + lb;                 // k=3, p=2, c=1
        let sev = sum >= 5 ? "major" : sum >= 3 ? "moderate" : null;  // c+c(2) não dispara
        if (kdownList) sev = sev === "moderate" ? "major" : sev === null ? "moderate" : sev;
        if (sev)
          push(sev, "Prolongamento aditivo do intervalo QT — risco de torsades de pointes." +
                    (kdownList ? " A hipocaliemia agrava." : ""),
               "Evitar/vigiar; ECG e correção de eletrólitos (K, Mg).");
      }

      // --- CYP3A4: inibidor por potência × substrato ---
      const colch = A.p.includes("colchicina") || B.p.includes("colchicina");
      let cyp3a4Fired = true;
      if (both("cyp3a4i_forte", "estatina3a4"))
        push("major", "Inibidor potente do CYP3A4 com estatina metabolizada por essa via — risco de rabdomiólise.",
             "Contraindicado; suspender a estatina ou trocar (ex.: pravastatina/rosuvastatina).");
      else if (both("cyp3a4i_mod", "estatina3a4"))
        push("moderate", "Inibidor moderado do CYP3A4 aumenta a exposição à estatina.",
             "Reduzir a dose da estatina (ex.: sinvastatina ≤ 20 mg) e vigiar.");
      else if (!colch && both("cyp3a4i_forte", "cyp3a4s_estreito"))
        push("major", "Inibidor potente do CYP3A4 com substrato de índice terapêutico estreito.",
             "Evitar ou reduzir muito a dose; vigiar toxicidade.");
      else if (!colch && both("cyp3a4i_mod", "cyp3a4s_estreito"))
        push("moderate", "Inibidor moderado do CYP3A4 aumenta um substrato de índice estreito.",
             "Reduzir dose e vigiar.");
      else if (both("cyp3a4i_forte", "cyp3a4s") || both("cyp3a4i_mod", "cyp3a4s"))
        push("moderate", "Inibidor do CYP3A4 aumenta a exposição de um substrato dessa via.",
             "Ponderar redução de dose e vigiar.");
      else cyp3a4Fired = false;

      if (both("cyp3a4ind", "estatina3a4") || both("cyp3a4ind", "cyp3a4s") ||
          both("cyp3a4ind", "cyp3a4s_estreito") || both("cyp3a4ind", "anticoag"))
        push("moderate", "Indutor do CYP3A4 reduz a exposição e a eficácia do fármaco associado.",
             "Vigiar eficácia; pode ser necessário ajustar a dose.");

      const sa = serLevel(A), sb = serLevel(B);
      if (sa && sb) {
        const ssev = sa === 2 && sb === 2 ? "major" : (sa + sb === 2 ? "minor" : "moderate");
        push(ssev,
             "Dois agentes serotoninérgicos — risco de síndrome serotoninérgica.",
             "Evitar ou vigiar sinais de excesso serotoninérgico.");
      }

      const avA = A.p.includes("avnode") || A.p.includes("avnode_forte");
      const avB = B.p.includes("avnode") || B.p.includes("avnode_forte");
      if (same("avnode_forte") || both("avnode_forte", "bbloq"))
        push("major", "Agentes dromotrópicos negativos potentes (verapamil/diltiazem/amiodarona ± beta-bloqueante) — bradicardia grave e bloqueio AV.",
             "Evitar a associação; se inevitável, vigilância apertada de FC e ECG.");
      else if (avA && avB && !both("digital", "pgpi"))
        push("moderate", "Efeito aditivo na condução AV — bradicardia.",
             "Vigiar FC e ECG; cautela na titulação.");

      if (both("colinergico", "avnode") || both("colinergico", "bbloq"))
        push("moderate", "Anticolinesterásico com agente bradicardizante — risco de bradicardia.",
             "Vigiar FC.");

      if (both("anticoag", "aine") || both("anticoag", "antiagreg") || both("anticoag", "isrs_hemorr"))
        push("major", "Risco hemorrágico elevado (anticoagulante associado a outro agente pró-hemorrágico).",
             "Rever necessidade; gastroproteção; vigiar sinais de hemorragia.");
      else if (both("antiagreg", "aine") || both("isrs_hemorr", "aine") || same("antiagreg"))
        push("moderate", "Risco aumentado de hemorragia (sobretudo gastrointestinal).",
             "Ponderar gastroproteção; rever o AINE.");

      if (both("aine", "corticoide"))
        push("moderate", "AINE com corticosteroide — risco aumentado de úlcera e hemorragia gastrointestinal.",
             "Evitar a associação ou associar gastroproteção.");

      // agente com risco GI (ex.: bifosfonato oral) + AINE — lesão da mucosa aditiva
      // (exclui corticoide/antiagregante, já cobertos por regras acima)
      const cortPair = A.p.includes("corticoide") || B.p.includes("corticoide");
      const antiagPair = A.p.includes("antiagreg") || B.p.includes("antiagreg");
      if (both("gi", "aine") && !cortPair && !antiagPair)
        push("minor", "Agente com risco gastrointestinal (ex.: bifosfonato oral) associado a AINE — lesão aditiva da mucosa.",
             "Precaução; ponderar gastroproteção e boa técnica de administração (bifosfonato: de pé, com água, em jejum).");

      if (both("inr_up_forte", "avk"))
        push("major", "Aumento potente do efeito da varfarina (ex.: metronidazol, fluconazol, cotrimoxazol, amiodarona) — risco hemorrágico.",
             "Vigiar INR aos 3–5 dias; ponderar reduzir a dose da varfarina.");
      else if (both("inr_up", "avk"))
        push("moderate", "Potencia o efeito da varfarina (aumento do INR).",
             "Vigiar INR durante e após a associação.");

      if (same("hiponatremia") && hipoNa < 3)
        push("moderate", "Risco aditivo de hiponatremia (ISRS/IRSN, tiazida/indapamida, carbamazepina) — sobretudo no idoso.",
             "Dosear o sódio 2 a 4 semanas após iniciar/ajustar; vigiar confusão e quedas.");

      if (both("sglt2", "diur"))
        push("moderate", "Gliflozina com diurético — depleção de volume aditiva (hipotensão, LRA pré-renal, síncope no idoso).",
             "Vigiar volémia e função renal; regras de dia de doença (suspender em doença aguda).");

      if (same("kup"))
        push("major", "Risco de hipercaliemia (dois agentes que retêm potássio).",
             "Vigiar K+ e função renal (basal, 1 e 4 semanas). Em IC-FEr, IECA/ARA + antagonista da aldosterona é terapêutico sob vigilância (distinto de IECA+ARA, que é desaconselhado).");
      else if (both("kup", "aine") && !(has("aine") && has("ieca_ara") && has("diur")))
        push("moderate", "AINE agrava a hipercaliemia e o risco renal.",
             "Vigiar potássio e creatinina.");

      if (both("kdown", "digital"))
        push("moderate", "Hipocaliemia induzida pelo diurético potencia a toxicidade digitálica.",
             "Vigiar potássio e níveis de digoxina.");

      if (both("litio", "aine") || both("litio", "diur") || both("litio", "ieca_ara"))
        push("major", "Aumento dos níveis séricos de lítio — risco de toxicidade.",
             "Vigiar litemia e função renal; ajustar dose.");

      if (both("colchicina", "pgpi") || both("colchicina", "cyp3a4i_forte") || both("colchicina", "cyp3a4i_mod"))
        push("major", "Colchicina com inibidor da P-gp/CYP3A4 — risco de toxicidade grave (potencialmente fatal na insuficiência renal).",
             "Evitar; se inevitável, reduzir muito a dose e vigiar.");
      else if (both("pgpi", "pgps") && !cyp3a4Fired && !both("digital", "pgpi"))
        push("moderate", "Inibidor da P-gp aumenta os níveis do substrato (ex.: digoxina, DOAC).",
             "Ponderar redução de dose e vigiar.");

      // digitálico + inibidor da P-gp: nó AV deprimido + ↑ níveis de digoxina (par de alto risco)
      if (both("digital", "pgpi"))
        push("major", "Digitálico com inibidor da P-gp (amiodarona, dronedarona, verapamil, diltiazem, claritromicina) — subida marcada dos níveis de digoxina e depressão do nó AV.",
             "Reduzir a digoxina ~50 %; vigiar digoxinemia, FC e ECG.");

      if (both("opioide", "benzo"))
        push("major", "Opioide com benzodiazepina — depressão aditiva do SNC e respiratória.",
             "Evitar; se necessário, doses mínimas e vigilância.");
      else if (both("opioide", "gabapentinoide"))
        push("major", "Opioide com gabapentinoide — risco de depressão respiratória (aviso FDA 2019).",
             "Evitar ou usar com extrema cautela; doses mínimas e vigilância.");
      else if (same("snc"))
        push("moderate", "Depressão do SNC aditiva (sedação).",
             "Cautela, sobretudo no idoso (quedas).");

      if (same("anticol"))
        push("moderate", "Carga anticolinérgica aditiva.",
             "Cautela no idoso (confusão, retenção urinária, obstipação).");

      if (both("nitrato", "pde5"))
        push("major", "Nitrato com inibidor da PDE5 — hipotensão grave.",
             "Contraindicado — não associar.");
      else if (both("alfa1blq", "pde5"))
        push("moderate", "Alfa-bloqueante com inibidor da PDE5 — hipotensão aditiva.",
             "Separar as tomas; iniciar com dose baixa.");

      if (both("bbloq", "hipoglic"))
        push("moderate", "Beta-bloqueante pode mascarar os sintomas de hipoglicemia.",
             "Alertar o doente; reforçar a auto-vigilância da glicemia.");

      if (both("disglic", "hipoglic"))
        push("moderate", "Quinolona pode causar disglicemia no doente sob antidiabético.",
             "Reforçar a vigilância da glicemia durante o ciclo.");

      if (both("fibrato_alto", "estatina"))
        push("major", "Genfibrozil com estatina — risco elevado de miopatia/rabdomiólise.",
             "Evitar; se for preciso um fibrato, preferir fenofibrato.");
      else if (both("fibrato", "estatina"))
        push("moderate", "Fibrato com estatina — risco aumentado de miopatia.",
             "Vigiar sintomas musculares e CK.");

      if (both("hipergli", "hipoglic"))
        push("moderate", "Corticosteroide aumenta a glicemia e antagoniza o controlo glicémico.",
             "Reforçar a vigilância da glicemia; ajustar se necessário.");

      if (both("cyp2c19i", "clopidogrel"))
        push("moderate", "Inibidor do CYP2C19 reduz a ativação do clopidogrel.",
             "Preferir pantoprazol; rever a associação.");

      if (both("cyp2d6i", "tca"))
        push("moderate", "Inibidor do CYP2D6 aumenta os níveis do antidepressivo tricíclico.",
             "Ponderar redução de dose e vigiar.");

      if (both("cyp2d6i", "cyp2d6s"))
        push("moderate", "Inibidor do CYP2D6 aumenta a exposição do beta-bloqueante — risco de bradicardia.",
             "Vigiar FC; ponderar redução de dose.");

      if (both("valproato", "lamotrigina"))
        push("moderate", "Valproato aumenta os níveis de lamotrigina — risco de exantema/toxicidade.",
             "Titular a lamotrigina lentamente e com doses mais baixas.");
      if (both("valproato", "carbamazepina"))
        push("moderate", "Interação entre valproato e carbamazepina — níveis séricos alterados.",
             "Vigiar níveis e resposta clínica.");
      if (both("valproato", "avk"))
        push("moderate", "Valproato pode potenciar a varfarina (deslocação da ligação proteica).",
             "Vigiar INR.");

      // --- mecanismos adicionais (revisão clínica, ronda 2) ---
      if (both("xantina_oxidase_i", "tiopurina"))
        push("major", "Inibidor da xantina-oxidase com tiopurina (azatioprina/mercaptopurina) — acumulação e mielotoxicidade grave.",
             "Contraindicado ou reduzir a tiopurina a ~25 % com vigilância hematológica.");

      if (both("metotrexato", "aine") || both("metotrexato", "trimetoprim"))
        push("major", "Metotrexato com AINE ou trimetoprim — redução da eliminação e toxicidade (medular, mucosa).",
             "Evitar; se inevitável, vigilância clínica e analítica apertada.");

      if (both("cyp1a2i", "cyp1a2s"))
        push("moderate", "Inibidor do CYP1A2 aumenta a exposição do substrato (ex.: teofilina, tizanidina, olanzapina).",
             "Vigiar; ponderar redução de dose (tizanidina é contraindicada).");

      if (both("cyp2c9i", "sulfonilureia"))
        push("moderate", "Inibidor do CYP2C9 aumenta a sulfonilureia — risco de hipoglicemia.",
             "Reforçar a vigilância da glicemia; ponderar reduzir a dose.");

      if (both("inr_down", "avk") && !both("cyp3a4ind", "avk"))
        push("moderate", "Indutor enzimático reduz o efeito da varfarina (baixa o INR).",
             "Vigiar INR; pode ser necessário ajustar a dose.");

      if (both("quelacao_cationica", "catiao"))
        push("minor", "Quelação por catiões (ferro, cálcio, antiácidos) reduz a absorção.",
             "Separar as tomas 2 a 4 horas.");
    }
  }

  // hipocaliemia potencia o QT de um fármaco que o prolonga, mesmo isolado
  const qtSubs = subs.filter(s => qtLevel(s) >= 2);
  if (kdownList && qtSubs.length === 1)
    out.push({ a: qtSubs[0].d, b: "hipocaliemia (diurético)", sev: "moderate",
      mech: "Hipocaliemia potencia o prolongamento do QT.",
      act: "Corrigir e vigiar o potássio; ECG se sintomas." });

  // regra ao nível da lista inteira: "triplo whammy" renal
  if (has("aine") && has("ieca_ara") && has("diur"))
    out.push({ a: "AINE + IECA/ARA + diurético", b: "",
      sev: "major", mech: "Triplo whammy — combinação nefrotóxica.",
      act: "Risco de lesão renal aguda; evitar o AINE e vigiar a função renal." });

  // carga cumulativa de hiponatremia (>= 3 agentes) — risco de hiponatremia sintomática
  if (hipoNa >= 3)
    out.push({ a: "≥ 3 fármacos com risco de hiponatremia", b: "",
      sev: "major", mech: "Risco cumulativo de hiponatremia sintomática (confusão, quedas, convulsões no idoso).",
      act: "Dosear o sódio precocemente (3–7 dias); ponderar alternativas com menor risco." });

  // vários fármacos a afetar o INR em direções opostas
  if ((has("inr_up") || has("inr_up_forte")) && has("inr_down") && has("avk"))
    out.push({ a: "efeito sobre o INR", b: "",
      sev: "moderate", mech: "Fármacos que aumentam e reduzem o INR em simultâneo — efeito líquido imprevisível.",
      act: "Monitorizar o INR com maior frequência." });

  out.sort((x, y) => SEV_RANK[x.sev] - SEV_RANK[y.sev]);
  return out;
}

/* exportar para Node (testes); no browser fica global */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { analyze, PROP_LABELS, SEV_RANK };
}

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
  qt: "prolonga o QT", cyp3a4i: "inibidor CYP3A4", cyp3a4s: "substrato CYP3A4",
  cyp3a4ind: "indutor CYP3A4", estatina: "estatina", estatina3a4: "estatina (via CYP3A4)",
  cyp2c19i: "inibidor CYP2C19", cyp2d6i: "inibidor CYP2D6",
  seroton: "serotoninérgico", avnode: "deprime o nó AV", bbloq: "beta-bloqueante",
  colinergico: "colinérgico", anticoag: "anticoagulante", avk: "antagonista da vit. K",
  antiagreg: "antiagregante", clopidogrel: "clopidogrel", aine: "AINE", gi: "risco de úlcera/GI",
  isrs_hemorr: "risco hemorrágico (ISRS)", inr_up: "aumenta o INR",
  kup: "retém potássio", kdown: "baixa o potássio", ieca_ara: "bloqueio do SRAA",
  diur: "diurético", litio: "lítio", digital: "digitálico",
  pgpi: "inibidor da P-gp", pgps: "substrato da P-gp",
  snc: "depressor do SNC", opioide: "opioide", benzo: "benzodiazepina",
  anticol: "anticolinérgico", nitrato: "nitrato", pde5: "inibidor da PDE5",
  alfa1blq: "alfa-bloqueante", hipoglic: "risco de hipoglicemia",
  hipergli: "aumenta a glicemia", disglic: "disglicemia", fibrato: "fibrato", tca: "tricíclico",
  corticoide: "corticosteroide", valproato: "valproato (inibidor enzimático)",
  gabapentinoide: "gabapentinoide", fibrato_alto: "fibrato de alto risco (genfibrozil)",
  colchicina: "colchicina", carbamazepina: "carbamazepina", lamotrigina: "lamotrigina",
};

const SEV_RANK = { major: 0, moderate: 1, minor: 2 };

function analyze(subs) {
  const out = [];
  const has = p => subs.some(s => s.p.includes(p));

  for (let i = 0; i < subs.length; i++) {
    for (let j = i + 1; j < subs.length; j++) {
      const A = subs[i], B = subs[j];
      const both = (x, y) =>
        (A.p.includes(x) && B.p.includes(y)) || (A.p.includes(y) && B.p.includes(x));
      const same = x => A.p.includes(x) && B.p.includes(x);
      const push = (sev, mech, act) => out.push({ a: A.d, b: B.d, sev, mech, act });

      if (same("qt"))
        push("major", "Prolongamento aditivo do intervalo QT — risco de torsades de pointes.",
             "Evitar; se inevitável, vigiar ECG e eletrólitos (K, Mg).");

      if (both("cyp3a4i", "estatina3a4"))
        push("major", "Inibidor do CYP3A4 com estatina metabolizada por essa via — risco de miopatia/rabdomiólise.",
             "Suspender ou trocar a estatina enquanto durar o inibidor.");
      else if (both("cyp3a4i", "cyp3a4s") && !(A.p.includes("colchicina") || B.p.includes("colchicina")))
        push("moderate", "Inibidor do CYP3A4 aumenta a exposição de um substrato dessa via.",
             "Ponderar redução de dose e vigiar toxicidade.");

      if (both("cyp3a4ind", "estatina3a4") || both("cyp3a4ind", "cyp3a4s") || both("cyp3a4ind", "anticoag"))
        push("moderate", "Indutor do CYP3A4 reduz a exposição e a eficácia do fármaco associado.",
             "Vigiar eficácia; pode ser necessário ajustar a dose.");

      if (same("seroton"))
        push("major", "Dois agentes serotoninérgicos — risco de síndrome serotoninérgica.",
             "Evitar ou vigiar sinais de excesso serotoninérgico.");

      if (same("avnode"))
        push("major", "Efeito aditivo na condução AV — bradicardia e bloqueio.",
             "Evitar; vigiar FC e ECG.");

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

      if (both("inr_up", "avk"))
        push("moderate", "Potencia o efeito da varfarina (aumento do INR).",
             "Vigiar INR durante e após a associação.");

      if (same("kup"))
        push("major", "Risco de hipercaliemia (dois agentes que retêm potássio).",
             "Vigiar potássio e função renal.");
      else if (both("kup", "aine"))
        push("moderate", "AINE agrava a hipercaliemia e o risco renal.",
             "Vigiar potássio e creatinina.");

      if (both("kdown", "digital"))
        push("moderate", "Hipocaliemia induzida pelo diurético potencia a toxicidade digitálica.",
             "Vigiar potássio e níveis de digoxina.");
      if (both("kdown", "qt"))
        push("moderate", "Hipocaliemia potencia o prolongamento do QT.",
             "Vigiar e corrigir o potássio.");

      if (both("litio", "aine") || both("litio", "diur") || both("litio", "ieca_ara"))
        push("major", "Aumento dos níveis séricos de lítio — risco de toxicidade.",
             "Vigiar litemia e função renal; ajustar dose.");

      if (both("colchicina", "pgpi") || both("colchicina", "cyp3a4i"))
        push("major", "Colchicina com inibidor da P-gp/CYP3A4 — risco de toxicidade grave (potencialmente fatal na insuficiência renal).",
             "Evitar; se inevitável, reduzir muito a dose e vigiar.");
      else if (both("pgpi", "pgps"))
        push("moderate", "Inibidor da P-gp aumenta os níveis do substrato (ex.: digoxina, DOAC).",
             "Ponderar redução de dose e vigiar.");

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

      if (both("valproato", "lamotrigina"))
        push("moderate", "Valproato aumenta os níveis de lamotrigina — risco de exantema/toxicidade.",
             "Titular a lamotrigina lentamente e com doses mais baixas.");
      if (both("valproato", "carbamazepina"))
        push("moderate", "Interação entre valproato e carbamazepina — níveis séricos alterados.",
             "Vigiar níveis e resposta clínica.");
      if (both("valproato", "avk"))
        push("moderate", "Valproato pode potenciar a varfarina (deslocação da ligação proteica).",
             "Vigiar INR.");
    }
  }

  // regra ao nível da lista inteira: "triplo whammy" renal
  if (has("aine") && has("ieca_ara") && has("diur"))
    out.push({ a: "AINE + IECA/ARA + diurético", b: "",
      sev: "major", mech: "Triplo whammy — combinação nefrotóxica.",
      act: "Risco de lesão renal aguda; evitar o AINE e vigiar a função renal." });

  out.sort((x, y) => SEV_RANK[x.sev] - SEV_RANK[y.sev]);
  return out;
}

/* exportar para Node (testes); no browser fica global */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { analyze, PROP_LABELS, SEV_RANK };
}

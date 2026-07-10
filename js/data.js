/* =====================================================================
   Revista — camada de dados (base de conhecimento)
   ---------------------------------------------------------------------
   Este ficheiro contém APENAS conhecimento clínico, separado da lógica:
     - DRUGS   : catálogo de fármacos (código, nome, classe)
     - RULES   : base de regras de interação (mecanismo, severidade, conduta)
     - SEV_RANK: ordem de severidade para ordenação

   Ilustrativo e não exaustivo — construído a partir de farmacologia
   clássica bem documentada. Em produção, esta camada é substituída por
   uma base validada e versionada (DrugBank, Stockley's, INFARMED, etc.).

   Para adicionar um fármaco: acrescente uma entrada a DRUGS.
   Para adicionar uma interação: acrescente uma entrada a RULES, com a
   chave formada pelos dois IDs por ordem alfabética, separados por "|".
   ===================================================================== */

/* ===== catálogo ===== */
const DRUGS = {
  varfarina:      { code: "VAR", name: "Varfarina",      cls: "Anticoagulante" },
  ibuprofeno:     { code: "IBU", name: "Ibuprofeno",     cls: "AINE" },
  amiodarona:     { code: "AMI", name: "Amiodarona",     cls: "Antiarrítmico" },
  sinvastatina:   { code: "SIN", name: "Sinvastatina",   cls: "Estatina" },
  digoxina:       { code: "DIG", name: "Digoxina",       cls: "Digitálico" },
  enalapril:      { code: "ENA", name: "Enalapril",      cls: "IECA" },
  espironolactona:{ code: "ESP", name: "Espironolactona",cls: "Diurético poupador de K" },
  furosemida:     { code: "FUR", name: "Furosemida",     cls: "Diurético de ansa" },
  sertralina:     { code: "SER", name: "Sertralina",     cls: "ISRS" },
  tramadol:       { code: "TRA", name: "Tramadol",       cls: "Opioide fraco" },
  clopidogrel:    { code: "CLO", name: "Clopidogrel",    cls: "Antiagregante" },
  omeprazol:      { code: "OME", name: "Omeprazol",      cls: "IBP" },
  verapamil:      { code: "VER", name: "Verapamil",      cls: "BCC não di-hidropiridínico" },
  metformina:     { code: "MET", name: "Metformina",     cls: "Antidiabético" }
};

/* ===== base de conhecimento de interações (ilustrativa) ===== */
const RULES = {
  "amiodarona|varfarina":      { sev: "major",    mech: "A amiodarona inibe o metabolismo da varfarina e aumenta o INR.", act: "Reduzir dose de varfarina e monitorizar INR de perto." },
  "ibuprofeno|varfarina":      { sev: "major",    mech: "AINE com anticoagulante: risco hemorrágico marcado, sobretudo gastrointestinal.", act: "Evitar AINE. Preferir paracetamol." },
  "amiodarona|sinvastatina":   { sev: "major",    mech: "A amiodarona aumenta a exposição à sinvastatina, com risco de miopatia e rabdomiólise.", act: "Limitar sinvastatina a 20 mg/dia ou trocar de estatina." },
  "amiodarona|digoxina":       { sev: "major",    mech: "A amiodarona aumenta os níveis séricos de digoxina.", act: "Reduzir dose de digoxina cerca de 50% e doseamento sérico." },
  "enalapril|espironolactona": { sev: "major",    mech: "IECA com poupador de potássio: risco de hipercaliemia.", act: "Vigiar potássio e função renal. Cautela no idoso." },
  "sertralina|tramadol":       { sev: "major",    mech: "Dois agentes serotoninérgicos: risco de síndrome serotoninérgica.", act: "Evitar associação ou vigiar sinais de excesso serotoninérgico." },
  "amiodarona|verapamil":      { sev: "major",    mech: "Efeito aditivo na condução AV: risco de bradicardia grave e bloqueio.", act: "Evitar. Se inevitável, vigilância de FC e ECG." },
  "digoxina|verapamil":        { sev: "major",    mech: "O verapamil aumenta os níveis de digoxina e soma efeito no nó AV.", act: "Reduzir dose de digoxina e monitorizar." },
  "sertralina|varfarina":      { sev: "moderate", mech: "ISRS reduz a agregação plaquetária e potencia o efeito anticoagulante.", act: "Vigiar sinais de hemorragia e INR." },
  "digoxina|furosemida":       { sev: "moderate", mech: "A hipocaliemia induzida pelo diurético potencia a toxicidade digitálica.", act: "Monitorizar potássio e níveis de digoxina." },
  "enalapril|ibuprofeno":      { sev: "moderate", mech: "O AINE reduz o efeito anti-hipertensor e agrava o risco renal.", act: "Evitar uso prolongado. Vigiar TA e creatinina." },
  "espironolactona|ibuprofeno":{ sev: "moderate", mech: "AINE com poupador de potássio: agrava a hipercaliemia e o risco renal.", act: "Evitar associação. Vigiar potássio." },
  "ibuprofeno|sertralina":     { sev: "moderate", mech: "ISRS com AINE: risco aumentado de hemorragia gastrointestinal.", act: "Considerar gastroproteção ou evitar AINE." },
  "clopidogrel|omeprazol":     { sev: "moderate", mech: "O omeprazol reduz a ativação do clopidogrel via CYP2C19.", act: "Preferir pantoprazol como IBP." },
  "omeprazol|varfarina":       { sev: "minor",    mech: "O omeprazol pode aumentar modestamente o efeito da varfarina.", act: "Vigiar INR se sintomas." },
  "enalapril|furosemida":      { sev: "minor",    mech: "Risco de hipotensão na primeira dose, sobretudo em hipovolemia.", act: "Iniciar com dose baixa e vigiar TA." },
  "metformina|furosemida":     { sev: "minor",    mech: "Alterações da função renal podem afetar a depuração da metformina.", act: "Vigiar função renal." }
};

const SEV_RANK = { major: 0, moderate: 1, minor: 2 };

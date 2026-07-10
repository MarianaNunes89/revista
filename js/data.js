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
  varfarina:       { code: "VAR", name: "Varfarina",       cls: "Anticoagulante" },
  ibuprofeno:      { code: "IBU", name: "Ibuprofeno",      cls: "AINE" },
  amiodarona:      { code: "AMI", name: "Amiodarona",      cls: "Antiarrítmico" },
  sinvastatina:    { code: "SIN", name: "Sinvastatina",    cls: "Estatina" },
  digoxina:        { code: "DIG", name: "Digoxina",        cls: "Digitálico" },
  enalapril:       { code: "ENA", name: "Enalapril",       cls: "IECA" },
  espironolactona: { code: "ESP", name: "Espironolactona", cls: "Diurético poupador de K" },
  furosemida:      { code: "FUR", name: "Furosemida",      cls: "Diurético de ansa" },
  sertralina:      { code: "SER", name: "Sertralina",      cls: "ISRS" },
  tramadol:        { code: "TRA", name: "Tramadol",        cls: "Opioide fraco" },
  clopidogrel:     { code: "CLO", name: "Clopidogrel",     cls: "Antiagregante" },
  omeprazol:       { code: "OME", name: "Omeprazol",       cls: "IBP" },
  verapamil:       { code: "VER", name: "Verapamil",       cls: "BCC não di-hidropiridínico" },
  metformina:      { code: "MET", name: "Metformina",      cls: "Antidiabético" },
  claritromicina:  { code: "CLA", name: "Claritromicina",  cls: "Macrólido" },
  ciprofloxacina:  { code: "CIP", name: "Ciprofloxacina",  cls: "Quinolona" },
  bisoprolol:      { code: "BIS", name: "Bisoprolol",      cls: "Beta-bloqueante" },
  diltiazem:       { code: "DIL", name: "Diltiazem",       cls: "BCC não di-hidropiridínico" },
  litio:           { code: "LIT", name: "Lítio",           cls: "Estabilizador de humor" },
  citalopram:      { code: "CIT", name: "Citalopram",      cls: "ISRS" },
  levotiroxina:    { code: "LEV", name: "Levotiroxina",    cls: "Hormona tiroideia" },
  prednisolona:    { code: "PRE", name: "Prednisolona",    cls: "Corticosteroide" },
  amitriptilina:   { code: "AMT", name: "Amitriptilina",   cls: "Antidepressivo tricíclico" },
  gliclazida:      { code: "GLI", name: "Gliclazida",      cls: "Sulfonilureia" },
  diazepam:        { code: "DZP", name: "Diazepam",        cls: "Benzodiazepina" }
};

/* ===== base de conhecimento de interações (ilustrativa) ===== */
const RULES = {
  /* --- maiores --- */
  "amiodarona|varfarina":       { sev: "major", mech: "A amiodarona inibe o metabolismo da varfarina e aumenta o INR.", act: "Reduzir dose de varfarina e monitorizar INR de perto." },
  "ibuprofeno|varfarina":       { sev: "major", mech: "AINE com anticoagulante: risco hemorrágico marcado, sobretudo gastrointestinal.", act: "Evitar AINE. Preferir paracetamol." },
  "amiodarona|sinvastatina":    { sev: "major", mech: "A amiodarona aumenta a exposição à sinvastatina, com risco de miopatia e rabdomiólise.", act: "Limitar sinvastatina a 20 mg/dia ou trocar de estatina." },
  "amiodarona|digoxina":        { sev: "major", mech: "A amiodarona aumenta os níveis séricos de digoxina.", act: "Reduzir dose de digoxina cerca de 50% e doseamento sérico." },
  "enalapril|espironolactona":  { sev: "major", mech: "IECA com poupador de potássio: risco de hipercaliemia.", act: "Vigiar potássio e função renal. Cautela no idoso." },
  "sertralina|tramadol":        { sev: "major", mech: "Dois agentes serotoninérgicos: risco de síndrome serotoninérgica.", act: "Evitar associação ou vigiar sinais de excesso serotoninérgico." },
  "amiodarona|verapamil":       { sev: "major", mech: "Efeito aditivo na condução AV: risco de bradicardia grave e bloqueio.", act: "Evitar. Se inevitável, vigilância de FC e ECG." },
  "digoxina|verapamil":         { sev: "major", mech: "O verapamil aumenta os níveis de digoxina e soma efeito no nó AV.", act: "Reduzir dose de digoxina e monitorizar." },
  "amiodarona|bisoprolol":      { sev: "major", mech: "Efeito aditivo na condução AV: risco de bradicardia e bloqueio.", act: "Iniciar baixo, titular devagar, vigiar FC e ECG." },
  "bisoprolol|verapamil":       { sev: "major", mech: "Beta-bloqueante com BCC não di-hidropiridínico: bradicardia grave, bloqueio AV e hipotensão.", act: "Evitar a associação." },
  "bisoprolol|diltiazem":       { sev: "major", mech: "Beta-bloqueante com BCC não di-hidropiridínico: bradicardia grave e bloqueio AV.", act: "Evitar a associação." },
  "amiodarona|diltiazem":       { sev: "major", mech: "Efeito aditivo na condução AV: risco de bradicardia e bloqueio.", act: "Evitar. Se inevitável, vigiar FC e ECG." },
  "amiodarona|claritromicina":  { sev: "major", mech: "Dois agentes que prolongam o QT: risco de torsades de pointes.", act: "Evitar. Preferir azitromicina se for preciso um macrólido." },
  "amiodarona|ciprofloxacina":  { sev: "major", mech: "Prolongamento aditivo do QT: risco de torsades de pointes.", act: "Evitar. Escolher outra classe de antibiótico." },
  "amiodarona|amitriptilina":   { sev: "major", mech: "Prolongamento aditivo do QT.", act: "Evitar; se necessário, vigiar ECG e usar a menor dose." },
  "amiodarona|citalopram":      { sev: "major", mech: "Prolongamento aditivo do QT (o citalopram é dose-dependente no QT).", act: "Evitar ou limitar a dose de citalopram e vigiar ECG." },
  "claritromicina|sinvastatina":{ sev: "major", mech: "Inibição potente do CYP3A4: risco de miopatia e rabdomiólise.", act: "Suspender a sinvastatina durante o ciclo de antibiótico." },
  "claritromicina|verapamil":   { sev: "major", mech: "Inibição do CYP3A4 com efeito no nó AV: bradicardia e hipotensão.", act: "Evitar; preferir outro antibiótico." },
  "diltiazem|sinvastatina":     { sev: "major", mech: "O diltiazem inibe o CYP3A4 e aumenta a exposição à sinvastatina.", act: "Limitar sinvastatina a 20 mg/dia ou trocar de estatina." },
  "citalopram|tramadol":        { sev: "major", mech: "Dois agentes serotoninérgicos: risco de síndrome serotoninérgica.", act: "Evitar associação ou vigiar sinais de excesso serotoninérgico." },
  "amitriptilina|tramadol":     { sev: "major", mech: "Efeito serotoninérgico aditivo e redução do limiar convulsivo.", act: "Evitar. Preferir analgésico alternativo." },
  "ibuprofeno|litio":           { sev: "major", mech: "O AINE reduz a excreção renal de lítio e aumenta os seus níveis.", act: "Evitar AINE. Se inevitável, doseamento de lítio e função renal." },
  "furosemida|litio":           { sev: "major", mech: "O diurético reduz a depuração do lítio e aumenta os seus níveis.", act: "Vigiar litemia e função renal; ajustar dose." },
  "enalapril|litio":            { sev: "major", mech: "O IECA aumenta os níveis séricos de lítio.", act: "Vigiar litemia e função renal ao iniciar ou alterar dose." },
  "diazepam|tramadol":          { sev: "major", mech: "Benzodiazepina com opioide: depressão do SNC e respiratória aditiva.", act: "Evitar a associação; se necessária, doses mínimas e vigilância." },

  /* --- moderadas --- */
  "sertralina|varfarina":       { sev: "moderate", mech: "ISRS reduz a agregação plaquetária e potencia o efeito anticoagulante.", act: "Vigiar sinais de hemorragia e INR." },
  "digoxina|furosemida":        { sev: "moderate", mech: "A hipocaliemia induzida pelo diurético potencia a toxicidade digitálica.", act: "Monitorizar potássio e níveis de digoxina." },
  "enalapril|ibuprofeno":       { sev: "moderate", mech: "O AINE reduz o efeito anti-hipertensor e agrava o risco renal.", act: "Evitar uso prolongado. Vigiar TA e creatinina." },
  "espironolactona|ibuprofeno": { sev: "moderate", mech: "AINE com poupador de potássio: agrava a hipercaliemia e o risco renal.", act: "Evitar associação. Vigiar potássio." },
  "ibuprofeno|sertralina":      { sev: "moderate", mech: "ISRS com AINE: risco aumentado de hemorragia gastrointestinal.", act: "Considerar gastroproteção ou evitar AINE." },
  "clopidogrel|omeprazol":      { sev: "moderate", mech: "O omeprazol reduz a ativação do clopidogrel via CYP2C19.", act: "Preferir pantoprazol como IBP." },
  "claritromicina|varfarina":   { sev: "moderate", mech: "A claritromicina inibe o metabolismo da varfarina e aumenta o INR.", act: "Vigiar INR durante e após o ciclo." },
  "claritromicina|digoxina":    { sev: "moderate", mech: "A claritromicina aumenta os níveis de digoxina.", act: "Vigiar sinais de toxicidade e doseamento de digoxina." },
  "citalopram|claritromicina":  { sev: "moderate", mech: "Prolongamento aditivo do QT.", act: "Vigiar ECG; preferir azitromicina." },
  "ciprofloxacina|varfarina":   { sev: "moderate", mech: "A ciprofloxacina pode aumentar o efeito da varfarina.", act: "Vigiar INR durante o ciclo." },
  "ciprofloxacina|citalopram":  { sev: "moderate", mech: "Prolongamento aditivo do QT.", act: "Vigiar ECG; preferir outra classe de antibiótico." },
  "ciprofloxacina|gliclazida":  { sev: "moderate", mech: "As quinolonas podem causar disglicemia (hipo ou hiperglicemia).", act: "Reforçar a auto-vigilância da glicemia durante o ciclo." },
  "bisoprolol|digoxina":        { sev: "moderate", mech: "Efeito bradicardizante aditivo no nó AV.", act: "Vigiar FC; cautela na titulação." },
  "bisoprolol|gliclazida":      { sev: "moderate", mech: "O beta-bloqueante pode mascarar os sintomas de hipoglicemia.", act: "Alertar o doente; reforçar a vigilância da glicemia." },
  "digoxina|diltiazem":         { sev: "moderate", mech: "O diltiazem aumenta os níveis de digoxina e soma efeito no nó AV.", act: "Vigiar FC e doseamento de digoxina." },
  "citalopram|varfarina":       { sev: "moderate", mech: "ISRS reduz a agregação plaquetária e potencia o efeito anticoagulante.", act: "Vigiar sinais de hemorragia e INR." },
  "citalopram|ibuprofeno":      { sev: "moderate", mech: "ISRS com AINE: risco aumentado de hemorragia gastrointestinal.", act: "Considerar gastroproteção ou evitar AINE." },
  "amitriptilina|citalopram":   { sev: "moderate", mech: "Efeito serotoninérgico e prolongamento do QT aditivos.", act: "Evitar ou vigiar de perto; rever necessidade de ambos." },
  "amitriptilina|sertralina":   { sev: "moderate", mech: "A sertralina inibe o CYP2D6 e aumenta os níveis do tricíclico; efeito serotoninérgico aditivo.", act: "Ponderar redução de dose do tricíclico e vigiar." },
  "amitriptilina|diazepam":     { sev: "moderate", mech: "Sedação e depressão do SNC aditivas.", act: "Cautela, sobretudo no idoso (quedas); usar doses baixas." },
  "diazepam|sertralina":        { sev: "moderate", mech: "Sedação aditiva.", act: "Vigiar sonolência, sobretudo no idoso." },
  "levotiroxina|varfarina":     { sev: "moderate", mech: "A levotiroxina pode aumentar o efeito anticoagulante da varfarina.", act: "Vigiar INR ao iniciar ou ajustar a levotiroxina." },
  "ibuprofeno|prednisolona":    { sev: "moderate", mech: "AINE com corticosteroide: risco aumentado de úlcera e hemorragia GI.", act: "Evitar associação ou associar gastroproteção." },
  "furosemida|prednisolona":    { sev: "moderate", mech: "Efeito hipocaliémico aditivo.", act: "Vigiar potássio (importante se também fizer digoxina)." },
  "prednisolona|varfarina":     { sev: "moderate", mech: "Os corticosteroides podem alterar o efeito anticoagulante (habitualmente aumentam o INR).", act: "Vigiar INR durante a corticoterapia." },
  "gliclazida|prednisolona":    { sev: "moderate", mech: "O corticosteroide aumenta a glicemia e antagoniza o controlo.", act: "Reforçar a vigilância da glicemia; ajustar se necessário." },

  /* --- menores --- */
  "omeprazol|varfarina":        { sev: "minor", mech: "O omeprazol pode aumentar modestamente o efeito da varfarina.", act: "Vigiar INR se sintomas." },
  "enalapril|furosemida":       { sev: "minor", mech: "Risco de hipotensão na primeira dose, sobretudo em hipovolemia.", act: "Iniciar com dose baixa e vigiar TA." },
  "furosemida|metformina":      { sev: "minor", mech: "Alterações da função renal podem afetar a depuração da metformina.", act: "Vigiar função renal." },
  "levotiroxina|omeprazol":     { sev: "minor", mech: "A subida do pH gástrico pode reduzir a absorção da levotiroxina.", act: "Separar as tomas; vigiar TSH se sintomas." },
  "diazepam|omeprazol":         { sev: "minor", mech: "O omeprazol inibe o CYP2C19 e pode aumentar os níveis de diazepam.", act: "Vigiar sedação, sobretudo no idoso." }
};

const SEV_RANK = { major: 0, moderate: 1, minor: 2 };

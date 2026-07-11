# -*- coding: utf-8 -*-
"""
Revista — gerador do catálogo de substâncias ativas por classe (base ATC).
Fase 1: classes clinicamente relevantes para ambulatório / Medicina Geral e Familiar.

Estrutura ATC usada como sistema de classes:
  nível 1 = grupo anatómico (A, B, C, ...)
  a "classe" prática de cada substância é o subgrupo ATC (nível 3/4).

Saída: catalogo.json (estruturado) + catalogo.md (legível) na mesma pasta.
Ilustrativo e não exaustivo — a reconciliar depois contra a base do INFARMED/Infomed.
"""
import json, os, datetime

# grupo anatómico ATC (nível 1) -> etiqueta PT
GRUPOS = {
    "A": "Trato gastrointestinal e metabolismo",
    "B": "Sangue e órgãos hematopoiéticos",
    "C": "Sistema cardiovascular",
    "G": "Sistema geniturinário e hormonas sexuais",
    "H": "Hormonas sistémicas (excl. sexuais)",
    "J": "Anti-infecciosos gerais para uso sistémico",
    "L": "Antineoplásicos e imunomoduladores",
    "M": "Sistema musculoesquelético",
    "N": "Sistema nervoso",
    "P": "Antiparasitários",
    "R": "Sistema respiratório",
}

# ---------------------------------------------------------------------------
# Propriedades de mecanismo por classe (chave = atc_classe). Base da classe;
# exceções por substância em OVERR. Vocabulário em PROP_LABELS (js/engine.js).
# ---------------------------------------------------------------------------
PROPS = {
    "A10BB": ["hipoglic", "sulfonilureia"], "A10A": ["hipoglic"], "A10BK": ["sglt2"],
    "B01AA": ["anticoag", "avk"], "B01AF": ["anticoag", "pgps"], "B01AE": ["anticoag", "pgps"],
    "B01AC": ["antiagreg"], "B01AB": ["anticoag"], "B03A": ["catiao"],
    "C01AA": ["digital", "pgps", "avnode"],
    "C01BD": ["avnode_forte", "pgpi", "inr_up"], "C01BC": ["avnode"],
    "C01DA": ["nitrato"],
    "C03CA": ["kdown", "diur"], "C03AA": ["kdown", "diur", "hiponatremia"], "C03DA": ["kup"],
    "C07AB": ["avnode", "bbloq"], "C07AG": ["avnode", "bbloq"], "C07AA": ["avnode", "bbloq"],
    "C08CA": ["cyp3a4s"], "C08DA": ["avnode_forte", "pgpi", "cyp3a4s", "ccb_nondhp"],
    "C09AA": ["ieca_ara", "kup"], "C09CA": ["ieca_ara", "kup"],
    "C10AA": ["estatina"], "C10AB": ["fibrato"],
    "G04CA": ["alfa1blq", "cyp3a4s"], "G04BE": ["pde5", "cyp3a4s"],
    "H02AB": ["gi", "kdown", "hipergli", "corticoide"], "H03AA": ["quelacao_cationica"],
    "J01AA": ["quelacao_cationica"],
    "J01MA": ["inr_up", "disglic", "quelacao_cationica"], "J01EE": ["inr_up", "kup"],
    "J02AC": ["inr_up"],
    "M01AE": ["aine", "gi"], "M01AB": ["aine", "gi"], "M01AC": ["aine", "gi"], "M01AH": ["aine", "gi"],
    "M04AC": ["cyp3a4s_estreito", "pgps"], "M04AA": ["xantina_oxidase_i"],
    "M05BA": ["quelacao_cationica"],
    "N02AA": ["opioide", "snc"], "N02AX": ["opioide", "snc"], "N02AB": ["opioide", "snc", "cyp3a4s_estreito"],
    "N02CC": [],
    "N03AF": ["cyp3a4ind"], "N03AG": ["valproato"],
    "N05AH": ["snc"], "N05AX": ["snc"], "N05AD": ["snc", "anticol"],
    "N05BA": ["benzo", "snc"], "N05CF": ["benzo", "snc"],
    "N06AB": ["isrs_hemorr", "hiponatremia"], "N06AX": ["isrs_hemorr"],
    "N06AA": ["tca", "anticol", "snc"], "N06DA": ["colinergico"], "N05AN": ["litio"],
    "P01AB": ["inr_up", "cyp2c9i", "dissulfiram"],
    "R03BB": ["anticol"], "R06AA": ["anticol", "snc"], "N05BB": ["anticol", "snc"],
    "L04AX": ["tiopurina"], "L01BA": ["metotrexato"],
}
# QT por nível de evidência (CredibleMeds): known / possible / conditional.
QT_LEVEL = {
    "C01BD01": "qt_known", "C01BD07": "qt_known", "A03FA03": "qt_known",
    "J01FA09": "qt_known", "J01FA01": "qt_known", "J01FA10": "qt_known",
    "J01MA12": "qt_known", "J02AC01": "qt_known", "N05AD01": "qt_known",
    "N06AB04": "qt_known", "N06AB10": "qt_known",
    "J01MA02": "qt_possible", "N05AH04": "qt_possible", "N05AH03": "qt_possible",
    "N05AX08": "qt_possible", "N06AX05": "qt_possible", "J02AC02": "qt_possible",
    "N05BB01": "qt_possible",
    "N06AA09": "qt_cond", "N06AA10": "qt_cond", "N06AA04": "qt_cond", "N06DA02": "qt_cond",
    "J01MA06": "qt_cond", "R03AC13": "qt_cond", "R03AC12": "qt_cond",
    "A02BA03": "qt_cond", "A03FA01": "qt_cond",
}
# Inibidores do CYP3A4 por potência (FDA).
CYP3A4I = {
    "J01FA09": "cyp3a4i_forte", "J02AC02": "cyp3a4i_forte",
    "J01FA01": "cyp3a4i_mod", "J02AC01": "cyp3a4i_mod",
    "C08DA01": "cyp3a4i_mod", "C08DB01": "cyp3a4i_mod",
    "C01BD01": "cyp3a4i_mod", "C01BD07": "cyp3a4i_mod",
}
# Atividade serotoninérgica graduada (forte / fraco).
SEROTON = {
    "N06AB06": "seroton_forte", "N06AB03": "seroton_forte", "N06AB04": "seroton_forte",
    "N06AB10": "seroton_forte", "N06AB05": "seroton_forte",   # ISRS
    "N06AX16": "seroton_forte", "N06AX21": "seroton_forte",   # venlafaxina, duloxetina
    "N02AX02": "seroton_forte", "N06AA04": "seroton_forte",   # tramadol, clomipramina
    "N02CC01": "seroton_fraco", "N06AX05": "seroton_fraco",   # sumatriptano, trazodona
    "N02AX06": "seroton_fraco",                               # tapentadol (SARI/opioide, risco < ISRS)
}
# Exceções por substância (atc5): adicionar/remover propriedades face à classe.
OVERR = {
    "A02BC01": {"add": ["cyp2c19i"]}, "A02BC05": {"add": ["cyp2c19i"]},   # omeprazol, esomeprazol
    "B01AC04": {"add": ["clopidogrel"]}, "B01AC06": {"add": ["gi"]},       # clopidogrel; AAS
    "B01AC24": {"add": ["cyp3a4s_estreito"]},                             # ticagrelor
    "B01AF01": {"add": ["cyp3a4s_estreito"]}, "B01AF02": {"add": ["cyp3a4s_estreito"]},  # rivaroxabano, apixabano
    "C10AA01": {"add": ["estatina3a4"]}, "C10AA05": {"add": ["estatina3a4"]},  # sinva, atorva
    "J01FA09": {"add": ["inr_up", "pgpi"]},                               # claritromicina (+ P-gp)
    "J01FA01": {"add": ["inr_up", "pgpi"]},                               # eritromicina (+ P-gp)
    "J01MA02": {"add": ["cyp1a2i"]},                                      # ciprofloxacina (CYP1A2)
    "J01MA06": {"rem": ["inr_up"]},                                       # norfloxacina (exposição baixa)
    "J02AC01": {"add": ["cyp2c9i", "inr_up_forte"]},                      # fluconazol (CYP2C9; ↑↑ INR)
    "J01EE01": {"add": ["cyp2c9i", "trimetoprim", "inr_up_forte"]},       # cotrimoxazol (↑↑ INR)
    "C01BD01": {"add": ["inr_up_forte"]},                                # amiodarona (↑↑ INR)
    "P01AB01": {"add": ["inr_up_forte"]},                                # metronidazol (↑↑ INR)
    "J01CF05": {"add": ["inr_down"]},                                     # flucloxacilina (indutor, reduz INR)
    "N06AB03": {"add": ["cyp2d6i"]}, "N06AB05": {"add": ["cyp2d6i"]},     # fluoxetina, paroxetina
    "N06AX05": {"add": ["snc", "hiponatremia"]},                          # trazodona (seroton via SEROTON; SIADH)
    "N06AX11": {"rem": ["isrs_hemorr"], "add": ["snc"]},                  # mirtazapina
    "N06AX12": {"rem": ["isrs_hemorr"], "add": ["cyp2d6i"]},              # bupropiom (seroton via SEROTON)
    "C07AG02": {"add": ["alfa1blq", "pgpi"]},                             # carvedilol
    "C03DA04": {"add": ["cyp3a4s"]},                                      # eplerenona
    "N05AH04": {"add": ["cyp3a4s_estreito"]},                            # quetiapina (índice estreito)
    "N05AH03": {"add": ["cyp1a2s"]},                                     # olanzapina (substrato CYP1A2)
    "N05BA12": {"add": ["cyp3a4s"]},                                     # alprazolam
    "N03AX12": {"add": ["snc", "gabapentinoide"]},                       # gabapentina
    "N03AX16": {"add": ["snc", "gabapentinoide"]},                       # pregabalina
    "N05AD01": {"rem": ["anticol"]},                                     # haloperidol (carga anticol. baixa)
    "C10AB04": {"add": ["fibrato_alto"]},                                # genfibrozil
    "M04AC01": {"add": ["colchicina"]},                                  # colchicina
    "N03AF01": {"add": ["carbamazepina", "inr_down", "hiponatremia"]},   # carbamazepina (alvo p/ valproato; indutor -> baixa INR; SIADH)
    "N06AX16": {"add": ["hiponatremia"]},                                # venlafaxina (IRSN)
    "N06AX21": {"add": ["hiponatremia"]},                                # duloxetina (IRSN)
    "M05BA04": {"add": ["gi"]},                                          # alendronato (esofagite; risco GI aditivo com AINE)
    "N03AX09": {"add": ["lamotrigina"]},                                 # lamotrigina (alvo p/ valproato)
    # --- ronda 3 (H, G, P + lacunas) ---
    "H02AB02": {"add": ["cyp3a4ind"]},                                   # dexametasona (indutor moderado 3A4)
    "H02AB04": {"add": ["cyp3a4s"]},                                     # metilprednisolona (substrato 3A4)
    "C01BC03": {"add": ["pgpi"]},                                        # propafenona (↑digoxina, ↑varfarina)
    "C07AB02": {"add": ["cyp2d6s"]},                                     # metoprolol
    "C07AB12": {"add": ["cyp2d6s"]},                                     # nebivolol
    "C07AA05": {"add": ["cyp2d6s"]},                                     # propranolol
    "C07AG02": {"add": ["alfa1blq", "pgpi", "cyp2d6s"]},                 # carvedilol (+ substrato 2D6)
}

def resolve_props(atc_classe, atc5):
    s = set(PROPS.get(atc_classe, []))
    ov = OVERR.get(atc5, {})
    for p in ov.get("add", []):
        s.add(p)
    for p in ov.get("rem", []):
        s.discard(p)
    if atc5 in QT_LEVEL:
        s.add(QT_LEVEL[atc5])
    if atc5 in CYP3A4I:
        s.add(CYP3A4I[atc5])
    if atc5 in SEROTON:
        s.add(SEROTON[atc5])
    return sorted(s)


# Cada classe: (atc_classe, nome_classe_PT, [ (atc5, dci_pt, inn_en), ... ])
CLASSES = [
  # ---------------- A ----------------
  ("A02BC", "Inibidores da bomba de protões (IBP)", [
      ("A02BC01","Omeprazol","omeprazole"),("A02BC02","Pantoprazol","pantoprazole"),
      ("A02BC03","Lansoprazol","lansoprazole"),("A02BC05","Esomeprazol","esomeprazole"),
      ("A02BC04","Rabeprazol","rabeprazole")]),
  ("A02BA", "Antagonistas dos recetores H2", [
      ("A02BA03","Famotidina","famotidine")]),   # ranitidina retirada do mercado (2020, NDMA)
  ("A03FA", "Procinéticos", [
      ("A03FA01","Metoclopramida","metoclopramide"),("A03FA03","Domperidona","domperidone")]),
  ("A06AD", "Laxantes osmóticos", [
      ("A06AD11","Lactulose","lactulose"),("A06AD15","Macrogol","macrogol")]),
  ("A07EC", "Aminossalicilatos (DII)", [
      ("A07EC01","Sulfassalazina","sulfasalazine"),("A07EC02","Mesalazina","mesalazine")]),
  ("A10BA", "Biguanidas", [("A10BA02","Metformina","metformin")]),
  ("A10BB", "Sulfonilureias", [
      ("A10BB09","Gliclazida","gliclazide"),("A10BB12","Glimepirida","glimepiride"),
      ("A10BB01","Glibenclamida","glibenclamide")]),
  ("A10BH", "Inibidores da DPP-4 (gliptinas)", [
      ("A10BH01","Sitagliptina","sitagliptin"),("A10BH05","Linagliptina","linagliptin"),
      ("A10BH02","Vildagliptina","vildagliptin"),("A10BH03","Saxagliptina","saxagliptin")]),
  ("A10BK", "Inibidores do SGLT2 (gliflozinas)", [
      ("A10BK01","Dapagliflozina","dapagliflozin"),("A10BK03","Empagliflozina","empagliflozin"),
      ("A10BK02","Canagliflozina","canagliflozin")]),
  ("A10BJ", "Agonistas do recetor GLP-1", [
      ("A10BJ06","Semaglutido","semaglutide"),("A10BJ05","Dulaglutido","dulaglutide"),
      ("A10BJ02","Liraglutido","liraglutide")]),
  ("A10A", "Insulinas e análogos", [
      ("A10AE04","Insulina glargina","insulin glargine"),("A10AB05","Insulina aspártico","insulin aspart"),
      ("A10AB01","Insulina humana","insulin (human)")]),
  ("A11CC", "Vitamina D e análogos", [("A11CC05","Colecalciferol","colecalciferol")]),

  # ---------------- B ----------------
  ("B01AA", "Antagonistas da vitamina K (AVK)", [
      ("B01AA03","Varfarina","warfarin"),("B01AA07","Acenocumarol","acenocoumarol")]),
  ("B01AF", "Inibidores diretos do fator Xa (DOAC)", [
      ("B01AF02","Apixabano","apixaban"),("B01AF01","Rivaroxabano","rivaroxaban"),
      ("B01AF03","Edoxabano","edoxaban")]),
  ("B01AE", "Inibidores diretos da trombina", [("B01AE07","Dabigatrano","dabigatran")]),
  ("B01AC", "Antiagregantes plaquetários", [
      ("B01AC06","Ácido acetilsalicílico","acetylsalicylic acid"),("B01AC04","Clopidogrel","clopidogrel"),
      ("B01AC24","Ticagrelor","ticagrelor"),("B01AC22","Prasugrel","prasugrel")]),
  ("B01AB", "Heparinas de baixo peso molecular", [
      ("B01AB05","Enoxaparina","enoxaparin"),("B01AB04","Dalteparina","dalteparin")]),
  ("B03A", "Preparações de ferro", [("B03AA07","Sulfato ferroso","ferrous sulfate")]),
  ("B03B", "Vitamina B12 e ácido fólico", [
      ("B03BB01","Ácido fólico","folic acid"),("B03BA01","Cianocobalamina","cyanocobalamin")]),

  # ---------------- C ----------------
  ("C01AA", "Glicósidos digitálicos", [("C01AA05","Digoxina","digoxin")]),
  ("C01BD", "Antiarrítmicos classe III", [
      ("C01BD01","Amiodarona","amiodarone"),("C01BD07","Dronedarona","dronedarone")]),
  ("C01BC", "Antiarrítmicos classe Ic", [
      ("C01BC04","Flecainida","flecainide"),("C01BC03","Propafenona","propafenone")]),
  ("C01DA", "Nitratos orgânicos", [
      ("C01DA08","Dinitrato de isossorbida","isosorbide dinitrate"),
      ("C01DA14","Mononitrato de isossorbida","isosorbide mononitrate")]),
  ("C03CA", "Diuréticos de ansa", [
      ("C03CA01","Furosemida","furosemide"),("C03CA04","Torasemida","torasemide")]),
  ("C03AA", "Tiazidas e análogos", [
      ("C03AA03","Hidroclorotiazida","hydrochlorothiazide"),("C03BA11","Indapamida","indapamide")]),
  ("C03DA", "Diuréticos poupadores de potássio", [
      ("C03DA01","Espironolactona","spironolactone"),("C03DA04","Eplerenona","eplerenone")]),
  ("C07AB", "Beta-bloqueantes cardiosseletivos", [
      ("C07AB07","Bisoprolol","bisoprolol"),("C07AB02","Metoprolol","metoprolol"),
      ("C07AB03","Atenolol","atenolol"),("C07AB12","Nebivolol","nebivolol")]),
  ("C07AG", "Beta-bloqueantes com bloqueio alfa", [("C07AG02","Carvedilol","carvedilol")]),
  ("C07AA", "Beta-bloqueantes não seletivos", [("C07AA05","Propranolol","propranolol")]),
  ("C08CA", "BCC di-hidropiridínicos", [
      ("C08CA01","Amlodipina","amlodipine"),("C08CA05","Nifedipina","nifedipine"),
      ("C08CA13","Lercanidipina","lercanidipine")]),
  ("C08DA", "BCC não di-hidropiridínicos", [
      ("C08DA01","Verapamil","verapamil"),("C08DB01","Diltiazem","diltiazem")]),
  ("C09AA", "IECA", [
      ("C09AA02","Enalapril","enalapril"),("C09AA05","Ramipril","ramipril"),
      ("C09AA04","Perindopril","perindopril"),("C09AA03","Lisinopril","lisinopril")]),
  ("C09CA", "Antagonistas dos recetores da angiotensina (ARA)", [
      ("C09CA01","Losartan","losartan"),("C09CA03","Valsartan","valsartan"),
      ("C09CA06","Candesartan","candesartan"),("C09CA07","Telmisartan","telmisartan"),
      ("C09CA04","Irbesartan","irbesartan")]),
  ("C10AA", "Estatinas (inibidores da HMG-CoA redutase)", [
      ("C10AA01","Sinvastatina","simvastatin"),("C10AA05","Atorvastatina","atorvastatin"),
      ("C10AA07","Rosuvastatina","rosuvastatin"),("C10AA03","Pravastatina","pravastatin")]),
  ("C10AB", "Fibratos", [
      ("C10AB05","Fenofibrato","fenofibrate"),("C10AB04","Genfibrozil","gemfibrozil")]),
  ("C10AX", "Outros modificadores dos lípidos", [("C10AX09","Ezetimiba","ezetimibe")]),

  # ---------------- G ----------------
  ("G04CA", "Alfa-bloqueantes (hiperplasia benigna da próstata)", [
      ("G04CA02","Tansulosina","tamsulosin"),("G04CA01","Alfuzosina","alfuzosin")]),
  ("G04CB", "Inibidores da 5-alfa-redutase", [
      ("G04CB01","Finasterida","finasteride"),("G04CB02","Dutasterida","dutasteride")]),
  ("G04BE", "Inibidores da PDE5", [
      ("G04BE03","Sildenafil","sildenafil"),("G04BE08","Tadalafil","tadalafil")]),

  # ---------------- H ----------------
  ("H02AB", "Corticosteroides sistémicos", [
      ("H02AB07","Prednisolona","prednisolone"),("H02AB06","Prednisona","prednisone"),
      ("H02AB02","Dexametasona","dexamethasone"),("H02AB04","Metilprednisolona","methylprednisolone"),
      ("H02AB09","Hidrocortisona","hydrocortisone")]),
  ("H03AA", "Hormonas tiroideias", [("H03AA01","Levotiroxina","levothyroxine")]),
  ("H03BB", "Antitiroideus (imidazóis)", [("H03BB02","Tiamazol","thiamazole")]),

  # ---------------- J ----------------
  ("J01CA", "Penicilinas de espectro alargado", [("J01CA04","Amoxicilina","amoxicillin")]),
  ("J01CR", "Penicilinas + inibidor de beta-lactamases", [
      ("J01CR02","Amoxicilina + ácido clavulânico","amoxicillin and clavulanic acid")]),
  ("J01CF", "Penicilinas antiestafilocócicas", [("J01CF05","Flucloxacilina","flucloxacillin")]),
  ("J01DC", "Cefalosporinas de 2.ª geração", [("J01DC02","Cefuroxima","cefuroxime")]),
  ("J01DD", "Cefalosporinas de 3.ª geração", [("J01DD04","Ceftriaxona","ceftriaxone")]),
  ("J01FA", "Macrólidos", [
      ("J01FA10","Azitromicina","azithromycin"),("J01FA09","Claritromicina","clarithromycin"),
      ("J01FA01","Eritromicina","erythromycin")]),
  ("J01FF", "Lincosamidas", [("J01FF01","Clindamicina","clindamycin")]),
  ("J01MA", "Fluoroquinolonas", [
      ("J01MA02","Ciprofloxacina","ciprofloxacin"),("J01MA12","Levofloxacina","levofloxacin"),
      ("J01MA06","Norfloxacina","norfloxacin")]),
  ("J01AA", "Tetraciclinas", [
      ("J01AA02","Doxiciclina","doxycycline"),("J01AA08","Minociclina","minocycline")]),
  ("J01EE", "Sulfonamidas + trimetoprim", [
      ("J01EE01","Cotrimoxazol (sulfametoxazol+trimetoprim)","sulfamethoxazole and trimethoprim")]),
  ("J01XE", "Nitrofuranos", [("J01XE01","Nitrofurantoína","nitrofurantoin")]),
  ("J02AC", "Antifúngicos triazólicos", [
      ("J02AC01","Fluconazol","fluconazole"),("J02AC02","Itraconazol","itraconazole")]),
  ("J05AB", "Antivirais (nucleósidos, herpes)", [
      ("J05AB01","Aciclovir","aciclovir"),("J05AB11","Valaciclovir","valaciclovir")]),

  # ---------------- M ----------------
  ("M01AE", "AINE derivados do ácido propiónico", [
      ("M01AE01","Ibuprofeno","ibuprofen"),("M01AE02","Naproxeno","naproxen"),
      ("M01AE03","Cetoprofeno","ketoprofen")]),
  ("M01AB", "AINE derivados do ácido acético", [
      ("M01AB05","Diclofenac","diclofenac"),("M01AB01","Indometacina","indomethacin")]),
  ("M01AC", "AINE oxicams", [
      ("M01AC01","Piroxicam","piroxicam"),("M01AC06","Meloxicam","meloxicam")]),
  ("M01AH", "AINE inibidores seletivos da COX-2", [
      ("M01AH05","Etoricoxib","etoricoxib"),("M01AH01","Celecoxib","celecoxib")]),
  ("M04AA", "Inibidores da xantina-oxidase (antigotosos)", [
      ("M04AA01","Alopurinol","allopurinol"),("M04AA03","Febuxostat","febuxostat")]),
  ("M04AC", "Colchicina", [("M04AC01","Colchicina","colchicine")]),
  ("M05BA", "Bifosfonatos", [
      ("M05BA04","Alendronato","alendronic acid"),("M05BA08","Ácido zoledrónico","zoledronic acid")]),

  # ---------------- N ----------------
  ("N02BE", "Anilidas (paracetamol)", [("N02BE01","Paracetamol","paracetamol")]),
  ("N02AA", "Opioides naturais", [
      ("N02AA01","Morfina","morphine"),("N02AA05","Oxicodona","oxycodone")]),
  ("N02AX", "Outros opioides", [
      ("N02AX02","Tramadol","tramadol"),("N02AX06","Tapentadol","tapentadol")]),
  ("N02AB", "Derivados da fenilpiperidina", [("N02AB03","Fentanil","fentanyl")]),
  ("N02CC", "Triptanos (agonistas 5-HT1)", [("N02CC01","Sumatriptano","sumatriptan")]),
  ("N03AX", "Outros antiepiléticos", [
      ("N03AX14","Levetiracetam","levetiracetam"),("N03AX12","Gabapentina","gabapentin"),
      ("N03AX16","Pregabalina","pregabalin"),("N03AX11","Topiramato","topiramate"),
      ("N03AX09","Lamotrigina","lamotrigine")]),
  ("N03AG", "Derivados de ácidos gordos (valproato)", [("N03AG01","Valproato de sódio","valproic acid")]),
  ("N03AF", "Derivados da carboxamida", [("N03AF01","Carbamazepina","carbamazepine")]),
  ("N05AH", "Antipsicóticos (diazepinas/oxazepinas)", [
      ("N05AH04","Quetiapina","quetiapine"),("N05AH03","Olanzapina","olanzapine")]),
  ("N05AX", "Outros antipsicóticos", [
      ("N05AX08","Risperidona","risperidone"),("N05AX12","Aripiprazol","aripiprazole")]),
  ("N05AD", "Butirofenonas", [("N05AD01","Haloperidol","haloperidol")]),
  ("N05BA", "Benzodiazepinas (ansiolíticos)", [
      ("N05BA01","Diazepam","diazepam"),("N05BA12","Alprazolam","alprazolam"),
      ("N05BA06","Lorazepam","lorazepam"),("N05BA08","Bromazepam","bromazepam")]),
  ("N05CF", "Hipnóticos análogos das benzodiazepinas", [
      ("N05CF02","Zolpidem","zolpidem"),("N05CF01","Zopiclona","zopiclone")]),
  ("N06AB", "ISRS (inibidores seletivos da recaptação da serotonina)", [
      ("N06AB06","Sertralina","sertraline"),("N06AB03","Fluoxetina","fluoxetine"),
      ("N06AB04","Citalopram","citalopram"),("N06AB10","Escitalopram","escitalopram"),
      ("N06AB05","Paroxetina","paroxetine")]),
  ("N06AX", "Outros antidepressivos", [
      ("N06AX16","Venlafaxina","venlafaxine"),("N06AX21","Duloxetina","duloxetine"),
      ("N06AX11","Mirtazapina","mirtazapine"),("N06AX05","Trazodona","trazodone"),
      ("N06AX12","Bupropiom","bupropion")]),
  ("N06AA", "Antidepressivos tricíclicos", [
      ("N06AA09","Amitriptilina","amitriptyline"),("N06AA10","Nortriptilina","nortriptyline"),
      ("N06AA04","Clomipramina","clomipramine")]),
  ("N05AN", "Lítio (estabilizador de humor)", [("N05AN01","Lítio","lithium")]),
  ("N06DA", "Anticolinesterásicos (demência)", [("N06DA02","Donepezilo","donepezil")]),
  ("N04BA", "Dopa e derivados", [("N04BA02","Levodopa + carbidopa","levodopa and carbidopa")]),

  # ---------------- L ----------------
  ("L04AX", "Imunossupressores (tiopurinas)", [
      ("L04AX01","Azatioprina","azathioprine"),("L01BB02","Mercaptopurina","mercaptopurine")]),
  ("L01BA", "Antimetabolito (metotrexato)", [("L01BA01","Metotrexato","methotrexate")]),

  # ---------------- P ----------------
  ("P01AB", "Nitroimidazóis", [("P01AB01","Metronidazol","metronidazole")]),

  # ---------------- R ----------------
  ("R03AC", "Agonistas beta-2 inalados", [
      ("R03AC02","Salbutamol","salbutamol"),("R03AC13","Formoterol","formoterol"),
      ("R03AC12","Salmeterol","salmeterol")]),
  ("R03BA", "Corticosteroides inalados", [
      ("R03BA02","Budesonida","budesonide"),("R03BA05","Fluticasona","fluticasone"),
      ("R03BA01","Beclometasona","beclometasone")]),
  ("R03BB", "Anticolinérgicos inalados", [
      ("R03BB01","Brometo de ipratrópio","ipratropium bromide"),("R03BB04","Tiotrópio","tiotropium")]),
  ("R03DC", "Antagonistas dos leucotrienos", [("R03DC03","Montelucaste","montelukast")]),
  ("R06AE", "Anti-histamínicos de 2.ª geração (piperazinas)", [
      ("R06AE07","Cetirizina","cetirizine"),("R06AE09","Levocetirizina","levocetirizine")]),
  ("R06AX", "Anti-histamínicos de 2.ª geração (outros)", [
      ("R06AX13","Loratadina","loratadine"),("R06AX27","Desloratadina","desloratadine"),
      ("R06AX26","Fexofenadina","fexofenadine"),("R06AX29","Bilastina","bilastine")]),
  ("R06AA", "Anti-histamínicos de 1.ª geração (aminoalquiléteres)", [
      ("R06AA02","Difenidramina","diphenhydramine")]),

  # Nota ATC: a hidroxizina é classificada em N (ansiolíticos), embora usada como
  # anti-histamínico sedativo — fica no grupo N para respeitar o ATC.
  ("N05BB", "Difenilmetano derivados (anti-histamínicos sedativos)", [
      ("N05BB01","Hidroxizina","hydroxyzine")]),
]

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    classes_out = []
    subs_total = 0
    codes = set()
    dup = []
    for atc_classe, nome_pt, subs in CLASSES:
        grupo = atc_classe[0]
        substancias = []
        for atc5, dci, inn in subs:
            if atc5 in codes:
                dup.append(atc5)
            codes.add(atc5)
            substancias.append({"atc": atc5, "dci": dci, "inn": inn,
                                "props": resolve_props(atc_classe, atc5)})
            subs_total += 1
        classes_out.append({
            "atc_classe": atc_classe,
            "classe": nome_pt,
            "grupo_atc": grupo,
            "grupo_nome": GRUPOS.get(grupo, grupo),
            "substancias": substancias,
        })

    catalogo = {
        "meta": {
            "nome": "Catálogo Revista — substâncias ativas por classe (base ATC)",
            "fase": "1 — classes relevantes para ambulatório / Medicina Geral e Familiar",
            "sistema_classes": "ATC (Anatomical Therapeutic Chemical, OMS)",
            "gerado_em": datetime.date.today().isoformat(),
            "n_grupos": len({c["grupo_atc"] for c in classes_out}),
            "n_classes": len(classes_out),
            "n_substancias": subs_total,
            "aviso": ("Ilustrativo e não exaustivo. Nomes em DCI (português). "
                      "A reconciliar contra a base do INFARMED/Infomed e a completar "
                      "com a totalidade do índice ATC numa fase seguinte."),
        },
        "classes": classes_out,
    }

    with open(os.path.join(here, "catalogo.json"), "w", encoding="utf-8") as f:
        json.dump(catalogo, f, ensure_ascii=False, indent=2)

    # js/catalog.js — consumido pelo browser (classes.html). Formato compacto.
    js_classes = []
    for c in classes_out:
        subs = [{"a": s["atc"], "d": s["dci"], "p": s["props"]} for s in c["substancias"]]
        js_classes.append({"c": c["atc_classe"], "n": c["classe"],
                           "g": c["grupo_atc"], "gn": c["grupo_nome"], "s": subs})
    js_dir = os.path.join(os.path.dirname(here), "js")
    os.makedirs(js_dir, exist_ok=True)
    with open(os.path.join(js_dir, "catalog.js"), "w", encoding="utf-8") as f:
        f.write("/* Gerado por data/build_catalogo.py — não editar à mão. */\n")
        f.write("/* Catálogo de substâncias por classe (ATC) com propriedades de mecanismo. */\n")
        f.write("const GRUPOS = " + json.dumps(GRUPOS, ensure_ascii=False) + ";\n")
        f.write("const CATALOG = " + json.dumps(js_classes, ensure_ascii=False) + ";\n")

    # contagem de propriedades (para diagnóstico)
    from collections import Counter
    pc = Counter(p for c in classes_out for s in c["substancias"] for p in s["props"])
    catalogo["meta"]["n_com_props"] = sum(
        1 for c in classes_out for s in c["substancias"] if s["props"])
    catalogo["_prop_counts"] = dict(pc)

    # markdown legível, agrupado por grupo anatómico
    lines = []
    lines.append("# Catálogo Revista — substâncias por classe (base ATC)\n")
    m = catalogo["meta"]
    lines.append(f"**Fase {m['fase']}**  ")
    lines.append(f"Sistema de classes: {m['sistema_classes']}  ")
    lines.append(f"Gerado em {m['gerado_em']} · {m['n_grupos']} grupos · "
                 f"{m['n_classes']} classes · {m['n_substancias']} substâncias\n")
    lines.append(f"> {m['aviso']}\n")
    por_grupo = {}
    for c in classes_out:
        por_grupo.setdefault((c["grupo_atc"], c["grupo_nome"]), []).append(c)
    for (g, gnome) in sorted(por_grupo):
        lines.append(f"\n## {g} — {gnome}\n")
        for c in por_grupo[(g, gnome)]:
            nomes = ", ".join(s["dci"] for s in c["substancias"])
            lines.append(f"- **{c['classe']}** (`{c['atc_classe']}`): {nomes}")
    with open(os.path.join(here, "catalogo.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print("classes:", len(classes_out), "| substâncias:", subs_total,
          "| grupos:", catalogo["meta"]["n_grupos"])
    print("duplicados:", dup if dup else "nenhum")

if __name__ == "__main__":
    main()

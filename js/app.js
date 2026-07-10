/* =====================================================================
   Revista — motor de análise + interface
   ---------------------------------------------------------------------
   Depende de data.js (DRUGS, RULES, SEV_RANK), que tem de carregar antes.

   Estrutura:
     - estado do doente (patient) + utilitários
     - findings(): cruza todos os pares e devolve as interações
     - advisor: evalBeta / evalAnticoag / evalAntihist / evalDiabetes / evalAbx
     - render(): desenha lista, matriz e interações
     - autocomplete + bind: interação do utilizador
   ===================================================================== */

/* ===== estado ===== */
let patient = ["varfarina","amiodarona","digoxina","sinvastatina","enalapril","espironolactona","furosemida","sertralina","ibuprofeno"];
const $ = s => document.querySelector(s);
const ruleFor = (a,b) => RULES[[a,b].sort().join("|")] || null;
const nPairs = n => n*(n-1)/2;
let selectedKey = null;

function findings(){
  const out=[];
  for(let i=0;i<patient.length;i++)for(let j=i+1;j<patient.length;j++){
    const r=ruleFor(patient[i],patient[j]); if(r)out.push({a:patient[i],b:patient[j],...r});
  }
  out.sort((x,y)=>SEV_RANK[x.sev]-SEV_RANK[y.sev]);
  return out;
}

/* ===== verdict helpers ===== */
const VR={avoid:0,caution:1,ok:2};
const worst=(a,b)=>VR[a]<=VR[b]?a:b;
const VLABEL={ok:["good","Preferível"],caution:["warn","Aceitável com precaução"],avoid:["avoid","Evitar"]};
function sortRanked(arr){arr.sort((a,b)=>VR[b.verdict]-VR[a.verdict]||a.interactions.length-b.interactions.length);}

function flags(){
  const has=id=>patient.includes(id);
  return{has,
    amiodarona:has("amiodarona"),verapamil:has("verapamil"),statin:has("sinvastatina"),warfarin:has("varfarina"),
    diabetes:has("metformina"),
    bleeders:["ibuprofeno","sertralina","clopidogrel","varfarina"].filter(has).map(x=>DRUGS[x].name),
    brady:["amiodarona","digoxina","verapamil"].filter(has).map(x=>DRUGS[x].name),
    sed:["sertralina","tramadol"].filter(has).map(x=>DRUGS[x].name),
    hfRegimen:has("enalapril")&&has("furosemida")&&(has("espironolactona")||has("digoxina"))
  };
}

/* ===== beta-blocker ===== */
function evalBeta(F){
  let banner=F.hfRegimen
    ?`O regime atual (IECA, diurético de ansa, poupador de potássio e/ou digoxina) é compatível com <b>insuficiência cardíaca com FE reduzida</b>, onde o beta-bloqueante faz parte do tratamento de base. A seleção dá prioridade aos agentes com evidência em IC.`
    :`Seleção por seletividade, perfil metabólico e tolerância. Sem regime sugestivo de IC nesta lista.`;
  if(F.brady.length)banner+=` <b>Atenção:</b> ${F.brady.join(" e ")} aumenta${F.brady.length>1?"m":""} o risco de bradicardia e bloqueio AV. Iniciar baixo, titular devagar, vigiar FC e ECG.`;
  if(F.diabetes)banner+=` Doente com metformina: preferir agente cardiosseletivo.`;
  const M=[
    {name:"Bisoprolol",props:["cardiosseletivo β1","1x/dia"],hf:true,note:"Cardiosseletivo, com evidência sólida em IC-FEr. Escolha pragmática de primeira linha."},
    {name:"Nebivolol",props:["cardiosseletivo β1","vasodilatador"],hf:true,note:"Cardiosseletivo e vasodilatador, com evidência em IC no idoso (SENIORS). Boa tolerância."},
    {name:"Carvedilol",props:["não seletivo","bloqueio α e β"],hf:true,note:"Evidência forte em IC; o bloqueio alfa acrescenta descida tensional sobre o IECA e o diurético."},
    {name:"Metoprolol",props:["cardiosseletivo β1"],hf:"succ",note:"Só a formulação de libertação prolongada (succinato) tem evidência em IC. Confirmar a formulação."},
    {name:"Atenolol",props:["cardiosseletivo β1","excreção renal"],hf:false,renal:true,note:"Sem evidência em IC e de excreção renal, com risco de acumulação no idoso. Preterir."},
    {name:"Propranolol",props:["não seletivo","lipofílico"],hf:false,note:"Sem indicação em IC e não seletivo. Mascara hipoglicemia; menos adequado no idoso polimedicado."}
  ];
  const ranked=M.map(m=>{
    let v="ok";
    if(F.hfRegimen){ if(m.hf===true)v="ok"; else if(m.hf==="succ")v=worst(v,"caution"); else v=worst(v,"avoid"); }
    if(m.renal)v=worst(v,"caution");
    if(F.diabetes&&m.props.some(p=>p.includes("não seletivo")))v=worst(v,"caution");
    return {name:m.name,props:m.props,note:m.note,interactions:[],verdict:v};
  });
  sortRanked(ranked);
  return {banner,ranked};
}

/* ===== anticoagulant ===== */
function evalAnticoag(F){
  let banner=`Seleção de anticoagulante ponderando interações e risco hemorrágico da lista atual.`;
  if(F.warfarin)banner+=` <b>Nota:</b> o doente já faz varfarina; confirmar se se pretende substituir.`;
  const bleed=F.bleeders.length?{sev:"moderate",text:`Risco hemorrágico aditivo com ${F.bleeders.join(", ")}. Rever AINE e antiagregante.`}:null;
  const M=[
    {name:"Apixabano",props:["DOAC","2x/dia"],note:"Perfil hemorrágico favorável e razoável tolerância renal. Frequentemente preferido no idoso."},
    {name:"Edoxabano",props:["DOAC","1x/dia"],pgp:true,note:"Toma única diária."},
    {name:"Rivaroxabano",props:["DOAC","1x/dia, com alimentos"],note:"Toma única; tomar com alimentos."},
    {name:"Dabigatrano",props:["DOAC","2x/dia"],pgp:true,note:"Mais dependente da função renal; dispepsia frequente."},
    {name:"Varfarina",props:["AVK","monitorização INR"],avk:true,note:"Muitas interações, mas reversível e monitorizável. Opção quando os DOAC estão contraindicados."}
  ];
  const ranked=M.map(m=>{
    const I=[];let v="ok";
    if(bleed){I.push(bleed);v=worst(v,"caution");}
    if(F.amiodarona){
      if(m.avk){I.push({sev:"moderate",text:"Amiodarona aumenta o INR; monitorização apertada."});v=worst(v,"caution");}
      else if(m.pgp){I.push({sev:"moderate",text:"Amiodarona inibe a P-gp e aumenta os níveis; ponderar redução de dose."});v=worst(v,"caution");}
      else I.push({sev:"minor",text:"Amiodarona pode aumentar ligeiramente os níveis."});
    }
    if(F.verapamil&&m.pgp){I.push({sev:"moderate",text:"Verapamil, inibidor da P-gp, aumenta os níveis."});v=worst(v,"caution");}
    return {name:m.name,props:m.props,note:m.note,interactions:I,verdict:v};
  });
  sortRanked(ranked);
  return {banner,ranked};
}

/* ===== antihistamine ===== */
function evalAntihist(F){
  let banner=`As anti-histamínicas de 2ª geração são preferíveis pela menor sedação e menor risco de interações. As de 1ª geração têm carga anticolinérgica e podem prolongar o QT.`;
  const M=[
    {name:"Fexofenadina",props:["2ª geração","não sedativa"],gen:2,note:"Interações mínimas e sem efeito relevante no QT. Opção mais segura no polimedicado."},
    {name:"Loratadina",props:["2ª geração"],gen:2,note:"Baixa sedação e poucas interações."},
    {name:"Desloratadina",props:["2ª geração"],gen:2,note:"Metabolito da loratadina; perfil semelhante."},
    {name:"Cetirizina",props:["2ª geração"],gen:2,note:"Eficaz; sedação ligeira possível."},
    {name:"Hidroxizina",props:["1ª geração","sedativa","anticolinérgica"],gen:1,qt:true,note:"Sedação e efeito anticolinérgico; prolonga o QT."},
    {name:"Difenidramina",props:["1ª geração","anticolinérgica forte"],gen:1,note:"Carga anticolinérgica elevada; evitar no idoso (critérios de Beers)."}
  ];
  const ranked=M.map(m=>{
    const I=[];let v="ok";
    if(m.gen===1){v=worst(v,"caution");I.push({sev:"moderate",text:"1ª geração: sedação e carga anticolinérgica, sobretudo no idoso."});}
    if(m.qt&&F.amiodarona){v=worst(v,"avoid");I.push({sev:"major",text:"Com amiodarona: prolongamento aditivo do QT. Evitar."});}
    if(m.gen===1&&F.sed.length){I.push({sev:"moderate",text:`Sedação aditiva com ${F.sed.join(", ")}.`});v=worst(v,"caution");}
    if(m.name==="Difenidramina")v=worst(v,"avoid");
    return {name:m.name,props:m.props,note:m.note,interactions:I,verdict:v};
  });
  sortRanked(ranked);
  return {banner,ranked};
}

/* ===== oral antidiabetics (ADA 2025/26, ESC 2023, SPD) ===== */
function dmPriority(c,hf,ascvd){
  let p=0;
  if(c.sglt2) p=hf?10:7;
  if(c.base) p=8;
  if(c.glp1) p=ascvd?9:6;
  if(c.dpp4) p=5;
  if(c.glin) p=4;
  if(c.su) p=3;
  if(c.aglu) p=2;
  if(c.tzd) p=1;
  return p;
}
function evalDiabetes(F){
  const hf=F.hfRegimen, ascvd=F.has("clopidogrel"), loop=F.has("furosemida");
  const bb=["bisoprolol","carvedilol","metoprolol","atenolol","propranolol","nebivolol"].some(F.has);
  let banner=`A metformina é a base do controlo glicémico (se eGFR ≥ 30). `;
  if(hf) banner+=`Perante <b>insuficiência cardíaca</b>, um inibidor SGLT2 está indicado independentemente da metformina e da HbA1c (ADA 2025, ESC 2023, recomendações SPD). `;
  else if(ascvd) banner+=`Perante doença cardiovascular aterosclerótica, preferir SGLT2i ou GLP-1 RA com benefício provado, independentemente da HbA1c. `;
  else banner+=`Sem doença CV, renal ou IC sugerida na lista, o 2º agente individualiza-se por peso, risco de hipoglicemia e custo. `;
  banner+=`Confirmar disponibilidade e comparticipação no INFARMED Infomed.`;
  const C=[
    {name:"Inibidor SGLT2 (gliflozina)",drugs:["Dapagliflozina","Empagliflozina","Canagliflozina","Ertugliflozina"],sglt2:true,
      note:"Benefício em IC, doença renal e CV, independente do efeito glicémico. Empagliflozina e dapagliflozina com evidência em IC."},
    {name:"Biguanida",drugs:["Metformina"],base:true,
      note:"Base do tratamento para controlo glicémico: barata e sem hipoglicemia. Contraindicada se eGFR < 30."},
    {name:"Agonista GLP-1 (oral)",drugs:["Semaglutida oral"],glp1:true,
      note:"Benefício CV e perda de peso; a maioria da classe é injetável. Preferível na obesidade ou doença CV."},
    {name:"Inibidor DPP-4 (gliptina)",drugs:["Sitagliptina","Linagliptina","Vildagliptina","Alogliptina"],dpp4:true,
      note:"Neutro no peso e baixo risco de hipoglicemia. Linagliptina útil na doença renal. Não associar a GLP-1."},
    {name:"Sulfonilureia",drugs:["Gliclazida","Glimepirida"],su:true,
      note:"Eficaz e barata, mas com hipoglicemia e ganho de peso. Preferir gliclazida; evitar glibenclamida no idoso."},
    {name:"Glinida (meglitinida)",drugs:["Repaglinida","Nateglinida"],glin:true,
      note:"Ação prandial curta; opção com refeições irregulares ou na doença renal. Hipoglicemia possível."},
    {name:"Inibidor da alfa-glucosidase",drugs:["Acarbose"],aglu:true,
      note:"Efeito modesto na HbA1c; tolerância gastrointestinal limitada (flatulência)."},
    {name:"Tiazolidinediona (glitazona)",drugs:["Pioglitazona"],tzd:true,
      note:"Sem hipoglicemia, mas com retenção de líquidos e ganho de peso."}
  ];
  const ranked=C.map(c=>{
    const I=[]; let v="ok";
    if(c.sglt2){
      if(loop) I.push({sev:"minor",text:"Com furosemida: vigiar volémia e tensão (efeito diurético aditivo)."});
      I.push({sev:"minor",text:"Risco de cetoacidose euglicémica; suspender em doença aguda ou jejum."});
    }
    if(c.base) I.push({sev:"minor",text:"Rever função renal; contraindicada se eGFR < 30."});
    if(c.dpp4 && hf) I.push({sev:"moderate",text:"Na IC, evitar a saxagliptina (sinal de hospitalização por IC); preferir sitagliptina ou linagliptina."});
    if(c.su){
      v=worst(v,"caution");
      I.push({sev:"moderate",text:"Risco de hipoglicemia e aumento de peso."});
      if(bb) I.push({sev:"moderate",text:"Beta-bloqueante na lista: pode mascarar os sintomas de hipoglicemia."});
    }
    if(c.tzd){
      if(hf){ v=worst(v,"avoid"); I.push({sev:"major",text:"Contraindicada na insuficiência cardíaca: a retenção de líquidos agrava a IC."}); }
      else { v=worst(v,"caution"); I.push({sev:"moderate",text:"Retenção de líquidos e ganho de peso; cautela se risco de IC."}); }
    }
    return {name:c.name,props:[],drugs:c.drugs,note:c.note,interactions:I,verdict:v,_p:dmPriority(c,hf,ascvd)};
  });
  ranked.sort((a,b)=>VR[b.verdict]-VR[a.verdict]||b._p-a._p);
  return {banner,ranked};
}

/* ===== antibiotics ===== */
const ABX={
  "Penicilinas":[
    {name:"Amoxicilina",props:["penicilina"],note:"Poucas interações farmacocinéticas; o limitante é a alergia."},
    {name:"Amoxicilina + clavulânico",props:["penicilina + inib. β-lactamase"],note:"Espetro alargado; mais efeitos GI e hepáticos."},
    {name:"Flucloxacilina",props:["penicilina antiestafilocócica"],note:"Útil em infeção cutânea; risco hepático."}
  ],
  "Quinolonas":[
    {name:"Ciprofloxacina",props:["quinolona"],note:"Inibe o CYP1A2; quelação com catiões; tendinopatia."},
    {name:"Levofloxacina",props:["quinolona respiratória"],note:"Boa cobertura respiratória; mesmos riscos de classe."},
    {name:"Norfloxacina",props:["quinolona urinária"],note:"Uso essencialmente urinário."}
  ],
  "Macrólidos":[
    {name:"Azitromicina",props:["macrólido"],cyp3a4:false,note:"Mínima inibição do CYP3A4; QT modesto. O menos problemático da classe."},
    {name:"Claritromicina",props:["macrólido"],cyp3a4:true,note:"Inibidor potente do CYP3A4; prolonga o QT."},
    {name:"Eritromicina",props:["macrólido"],cyp3a4:true,note:"Inibidor do CYP3A4; prolonga o QT; muitos efeitos GI."}
  ]
};
function evalAbxMember(cls,m,F){
  const I=[];let v="ok";
  if(F.amiodarona&&cls==="Quinolonas"){I.push({sev:"major",text:"Com amiodarona: prolongamento aditivo do QT, com risco de torsades. Evitar."});v=worst(v,"avoid");}
  if(F.amiodarona&&cls==="Macrólidos"){
    if(m.cyp3a4){I.push({sev:"major",text:"Com amiodarona: prolongamento aditivo do QT."});v=worst(v,"avoid");}
    else {I.push({sev:"moderate",text:"Com amiodarona: QT aditivo modesto; vigiar ECG."});v=worst(v,"caution");}
  }
  if(cls==="Macrólidos"&&m.cyp3a4&&F.statin){I.push({sev:"major",text:"Inibe o CYP3A4: risco de miopatia e rabdomiólise com a sinvastatina. Suspender a estatina durante o ciclo."});v=worst(v,"avoid");}
  if(F.warfarin){
    if(cls==="Macrólidos"&&m.cyp3a4){I.push({sev:"moderate",text:"Inibe o metabolismo da varfarina: aumento do INR."});v=worst(v,"caution");}
    else I.push({sev:"minor",text:"Pode aumentar o INR sob varfarina; vigiar."});
  }
  if(cls==="Quinolonas")I.push({sev:"minor",text:"Cautela no idoso: tendinopatia, disglicemia, baixa do limiar convulsivo, C. difficile."});
  return {name:m.name,props:m.props,note:m.note,interactions:I,verdict:v,cls};
}
function evalAbx(sel,F){
  const all=[];
  Object.keys(ABX).forEach(cls=>ABX[cls].forEach(m=>all.push(evalAbxMember(cls,m,F))));
  all.sort((a,b)=>VR[b.verdict]-VR[a.verdict]||a.interactions.length-b.interactions.length);
  const best=all[0];
  let banner=`Mais seguro nesta lista: <b>${best.name}</b> (${best.cls.toLowerCase()})`;
  if(best.interactions.length)banner+=`, não totalmente isento (${best.interactions[0].text.replace(/\.$/,"").toLowerCase()}).`;
  else banner+=`.`;
  const avoids=[...new Set(all.filter(x=>x.verdict==="avoid").map(x=>x.name))];
  if(avoids.length)banner+=` Evitar ${avoids.join(", ")} pelo perfil de interações desta lista.`;
  let ranked;
  if(sel==="all"){ranked=all;}
  else{ranked=ABX[sel].map(m=>evalAbxMember(sel,m,F));sortRanked(ranked);}
  return {banner,ranked,showClass:sel==="all"};
}

/* ===== render advisor ===== */
function renderRanked(outEl,res){
  outEl.classList.add("show");
  let html=`<div class="ctx"><span class="ic">i</span><div>${res.banner}</div></div>`;
  res.ranked.forEach((r,i)=>{
    const [vc,vl]=VLABEL[r.verdict];
    let chips=r.props.map(p=>`<span class="prop">${p}</span>`).join("");
    if(res.showClass&&r.cls)chips=`<span class="prop cls">${r.cls}</span>`+chips;
    if(r.drugs&&r.drugs.length)chips+=r.drugs.map(d=>`<span class="prop drug">${d}</span>`).join("");
    const inter=r.interactions.length
      ?`<div class="ilist">${r.interactions.map(x=>`<div class="iline"><span class="idot ${x.sev}"></span><span>${x.text}</span></div>`).join("")}</div>`:"";
    html+=`<div class="bbcard"><div class="rankno">${i+1}</div><div class="bbbody">
      <div class="bbtop"><span class="bbname">${r.name}</span><span class="verdict ${vc}">${vl}</span></div>
      ${chips?`<div class="props">${chips}</div>`:""}
      <p class="bbnote">${r.note}</p>${inter}
    </div></div>`;
  });
  outEl.innerHTML=html;
}

let startSelDone=null, abxSelDone=null;
function runStart(){
  const F=flags(), sel=$("#startSel").value;
  if(!sel){$("#startOut").classList.remove("show");startSelDone=null;return;}
  startSelDone=sel;
  const res = sel==="beta"?evalBeta(F) : sel==="anticoag"?evalAnticoag(F) : sel==="antihist"?evalAntihist(F) : evalDiabetes(F);
  renderRanked($("#startOut"),res);
}
function runAbx(){
  const F=flags(), sel=$("#abxSel").value;
  abxSelDone=sel;
  renderRanked($("#abxOut"),evalAbx(sel,F));
}

/* ===== main render ===== */
function render(){
  const n=patient.length,pairs=nPairs(n),fs=findings();
  $("#pairCount").textContent=pairs+" pares";

  const ml=$("#medList");ml.innerHTML="";
  const flagged={};
  fs.forEach(f=>{flagged[f.a]=Math.min(flagged[f.a]??9,SEV_RANK[f.sev]);flagged[f.b]=Math.min(flagged[f.b]??9,SEV_RANK[f.sev]);});
  patient.forEach(id=>{
    const d=DRUGS[id];let flag="";
    if(flagged[id]===0)flag=`<span class="flag" style="color:var(--major-text);background:var(--major-bg)">maior</span>`;
    else if(flagged[id]===1)flag=`<span class="flag" style="color:var(--moderate-text);background:var(--moderate-bg)">moderada</span>`;
    else if(flagged[id]===2)flag=`<span class="flag" style="color:var(--minor-text);background:var(--minor-bg)">menor</span>`;
    const row=document.createElement("div");row.className="med";
    row.innerHTML=`<span class="code">${d.code}</span><span class="name">${d.name}<small>${d.cls}</small></span>${flag}<button class="rm" title="Remover" data-id="${id}">×</button>`;
    ml.appendChild(row);
  });
  $("#medCount").textContent=n+(n===1?" fármaco":" fármacos");

  const box=$("#matrixBox");
  if(n<2)box.innerHTML=`<div class="empty">Adicione pelo menos dois fármacos.</div>`;
  else{
    let html=`<table class="mx"><tr><td></td>`;
    for(let c=0;c<n;c++)html+=`<td class="colh"><span>${DRUGS[patient[c]].code}</span></td>`;
    html+=`</tr>`;
    for(let r=0;r<n;r++){
      html+=`<tr><td class="rowh">${DRUGS[patient[r]].code}</td>`;
      for(let c=0;c<n;c++){
        if(c===r)html+=`<td><div class="cell diag"></div></td>`;
        else if(c>r)html+=`<td><div class="cell" style="visibility:hidden"></div></td>`;
        else{
          const rule=ruleFor(patient[r],patient[c]),key=[patient[r],patient[c]].sort().join("|");
          html+=rule?`<td><div class="cell ${rule.sev}${key===selectedKey?" sel":""}" data-key="${key}" title="${DRUGS[patient[r]].name} + ${DRUGS[patient[c]].name}"></div></td>`:`<td><div class="cell clean"></div></td>`;
        }
      }
      html+=`</tr>`;
    }
    box.innerHTML=html+`</table>`;
  }
  $("#mxCount").textContent=n>=2?pairs+" pares analisados":"·";

  const fbox=$("#findings");
  if(fs.length===0)fbox.innerHTML=`<div class="empty">Nenhuma interação conhecida nesta lista.</div>`;
  else{
    fbox.innerHTML="";
    fs.forEach(f=>{
      const key=[f.a,f.b].sort().join("|"),label={major:"Maior",moderate:"Moderada",minor:"Menor"}[f.sev];
      const card=document.createElement("div");card.className="fcard"+(key===selectedKey?" sel":"");card.dataset.key=key;
      card.innerHTML=`<div class="sevbar ${f.sev}"></div><div class="fbody"><div class="ftop"><span class="pair">${DRUGS[f.a].name}<em>+</em>${DRUGS[f.b].name}</span><span class="sevtag ${f.sev}">${label}</span></div><p class="mech">${f.mech}</p><p class="action"><b>Conduta:</b> ${f.act}</p></div>`;
      fbox.appendChild(card);
    });
  }
  const maj=fs.filter(f=>f.sev==="major").length;
  $("#findCount").textContent=fs.length===0?"0":`${fs.length} ${fs.length===1?"interação":"interações"}${maj?` · ${maj} maior${maj>1?"es":""}`:""}`;

  if(startSelDone)runStart();
  if(abxSelDone)runAbx();
  bind();
}

/* ===== autocomplete ===== */
const acInput=$("#acInput"),acList=$("#acList");
let acMatches=[],acActive=-1;
function acQuery(){
  const q=acInput.value.trim().toLowerCase();
  acMatches=Object.keys(DRUGS).filter(id=>!patient.includes(id))
    .filter(id=>q===""?true:(DRUGS[id].name.toLowerCase().includes(q)||DRUGS[id].cls.toLowerCase().includes(q)))
    .sort((a,b)=>DRUGS[a].name.localeCompare(DRUGS[b].name,"pt")).slice(0,8);
  acActive=-1;drawAc(q);
}
function drawAc(q){
  if(document.activeElement!==acInput){acList.classList.remove("show");return;}
  if(acMatches.length===0){acList.innerHTML=`<div class="ac-empty">Sem fármacos a mostrar.</div>`;acList.classList.add("show");acInput.setAttribute("aria-expanded","true");return;}
  acList.innerHTML=acMatches.map((id,i)=>{
    const d=DRUGS[id];let nm=d.name;
    if(q){const idx=nm.toLowerCase().indexOf(q);if(idx>=0)nm=nm.slice(0,idx)+"<b>"+nm.slice(idx,idx+q.length)+"</b>"+nm.slice(idx+q.length);}
    return `<div class="ac-item${i===acActive?" active":""}" role="option" data-id="${id}"><span class="code">${d.code}</span><span class="t">${nm}<small>${d.cls}</small></span></div>`;
  }).join("");
  acList.classList.add("show");acInput.setAttribute("aria-expanded","true");
  acList.querySelectorAll(".ac-item").forEach(el=>el.onmousedown=e=>{e.preventDefault();addDrug(el.dataset.id);});
}
function addDrug(id){
  if(id&&!patient.includes(id)){patient.push(id);selectedKey=null;}
  acInput.value="";acMatches=[];acActive=-1;acList.classList.remove("show");acInput.setAttribute("aria-expanded","false");
  render();acInput.focus();
}
acInput.addEventListener("input",acQuery);
acInput.addEventListener("focus",acQuery);
acInput.addEventListener("blur",()=>setTimeout(()=>{acList.classList.remove("show");acInput.setAttribute("aria-expanded","false");},120));
acInput.addEventListener("keydown",e=>{
  if(!acList.classList.contains("show"))return;
  if(e.key==="ArrowDown"){e.preventDefault();acActive=Math.min(acActive+1,acMatches.length-1);drawAc(acInput.value.trim().toLowerCase());}
  else if(e.key==="ArrowUp"){e.preventDefault();acActive=Math.max(acActive-1,0);drawAc(acInput.value.trim().toLowerCase());}
  else if(e.key==="Enter"){e.preventDefault();if(acActive>=0)addDrug(acMatches[acActive]);else if(acMatches.length===1)addDrug(acMatches[0]);}
  else if(e.key==="Escape"){acList.classList.remove("show");acInput.setAttribute("aria-expanded","false");}
});

/* ===== bind ===== */
function select(key){selectedKey=(selectedKey===key)?null:key;render();}
function bind(){
  document.querySelectorAll(".rm").forEach(b=>b.onclick=()=>{patient=patient.filter(x=>x!==b.dataset.id);selectedKey=null;render();});
  document.querySelectorAll(".cell.major,.cell.moderate,.cell.minor").forEach(c=>c.onclick=()=>select(c.dataset.key));
  document.querySelectorAll(".fcard").forEach(c=>c.onclick=()=>select(c.dataset.key));
}
$("#startBtn").onclick=()=>{runStart();$("#startOut").scrollIntoView({behavior:"smooth",block:"nearest"});};
$("#abxBtn").onclick=()=>{runAbx();$("#abxOut").scrollIntoView({behavior:"smooth",block:"nearest"});};

render();

# Revista — Changelog de revisão clínica (rondas 4–7)

Registo consolidado das alterações ao motor de interações (`js/engine.js`) e ao
catálogo por classes (`data/build_catalogo.py` → `js/catalog.js`), decorrentes do
ciclo de revisão baseada em evidência (validação por PubMed / Stockley's / RCM /
CredibleMeds / guidelines, com aplicação e teste local antes de cada publicação).

Estado atual: **92 classes, 195 substâncias, ~40 regras de mecanismo.** Ilustrativo
e não exaustivo; não substitui o juízo clínico nem se destina a uso clínico direto.

---

## Arquitetura graduada (visão de conjunto)

O princípio de fundo mantém-se: cada substância traz **propriedades de mecanismo** e
regras genéricas disparam quando duas propriedades se cruzam — um punhado de regras
cobre milhares de pares. O trabalho destas rondas foi **graduar a severidade** em vez
de tratar cada mecanismo como binário, o que eliminou de forma sistemática os falsos
positivos por "etiqueta larga".

Eixos graduados no final do ciclo:

- **QT** — por nível de evidência CredibleMeds (`qt_known` / `qt_possible` / `qt_cond`); a hipocaliemia escala um nível.
- **CYP3A4** — inibidor por potência (`cyp3a4i_forte` / `cyp3a4i_mod`) × tipo de substrato (estatina, índice estreito, geral).
- **Serotonina** — `seroton_forte` / `seroton_fraco` (forte+forte = maior, forte+fraco = moderada, fraco+fraco = menor).
- **Nó AV** — `avnode_forte` (verapamil, diltiazem, amiodarona, dronedarona) vs `avnode` simples.
- **INR / varfarina** — `inr_up_forte` (maior) vs `inr_up` (moderada); `inr_down` (indutor).
- **Eletrólitos** — potássio (`kup` / `kdown`) e sódio (`hiponatremia`, com regra de contagem).

---

## Ronda 4 — Auditoria de consistência

Origem: auditoria transversal do Claude Science (12 achados). Dois foram **falsos
alarmes** (confirmados por leitura direta do motor) e não exigiram ação; os restantes
foram calibrações/deduplicações.

Falsos alarmes (verificados, sem alteração):

- Regra fibrato+estatina "em falta" — **existe** (`fibrato_alto`/`fibrato` + `estatina`).
- CYP2D6 a disparar em `bbloq` genérico — **não**: `cyp2d6i` cruza só com `cyp2d6s` (metoprolol, nebivolol, carvedilol, propranolol).

Alterações aplicadas:

| # | Alteração | Nível |
|---|-----------|-------|
| 3 | Serotonina graduada: `seroton_forte` / `seroton_fraco` (via dicionário SEROTON + helper `serLevel`) | — |
| 9 | Nó AV graduado: beta-bloqueante + BCC não di-hidropiridínico → maior; restantes `avnode` → moderada | — |
| 2 | Deduplicação DOAC: regra P-gp genérica passa a exigir `!cyp3a4Fired` (evita 2 cartões para 3A4+P-gp) | — |
| 5 | `cyp2c9i` keia em `sulfonilureia` (deixa de disparar com insulina) | — |
| 7 | Conduta da hipercaliemia: esquema de vigilância do K⁺ (basal/1/4 sem) + nota IECA/ARA + antagonista da aldosterona ser terapêutico na IC-FEr | — |
| 12 | `kup`+`aine` deixa de duplicar com o "triplo whammy" (guarda `!(aine && ieca_ara && diur)`) | — |
| 8 | Nova regra de lista: `inr_up` + `inr_down` + AVK → moderada ("INR imprevisível") | — |

Fonte transversal: Stockley's; consenso.

---

## Ronda 5 — Serotonina, nó AV, INR e GI

**(a) Serotonina.** Calibração final forte+forte = maior · forte+fraco = moderada ·
fraco+fraco = menor.

| Propriedade | Substâncias | Fonte / nível |
|---|---|---|
| `seroton_forte` | 5 ISRS + venlafaxina + duloxetina + tramadol + clomipramina | Boyer & Shannon NEJM 2005; consenso |
| `seroton_fraco` | trazodona, sumatriptano, **tapentadol (novo)** | Stockley's; consenso (magnitude incerta) |
| — | mirtazapina permanece **sem etiqueta** (papel controverso, casos isolados) | incerto |

Nota triptanos: o aviso FDA 2006 foi reavaliado (AHS 2010) como evidência
insuficiente → `seroton_fraco`.

**(b) Nó AV.** Introduzida a propriedade `avnode_forte`.

| Propriedade | Substâncias |
|---|---|
| `avnode_forte` | verapamil, diltiazem, amiodarona, dronedarona |
| `avnode` (simples) | digoxina, beta-bloqueantes, donepezilo |

Regra: `avnode_forte` + `avnode_forte` **ou** `avnode_forte` + beta-bloqueante →
maior; restantes pares com efeito no nó AV → moderada. Digoxina + beta-bloqueante
mantém-se **moderada** (associação de guideline na FA — ESC 2020, não deve ser maior).

**(c) INR e GI.**

| Alteração | Substância | Nível | Fonte |
|---|---|---|---|
| `inr_down` (indutor, baixa o INR) | carbamazepina | moderada | MHRA; Stockley's |
| `gi` (esofagite) + regra `gi`+`aine` | alendronato | **menor** (magnitude incerta) | RCM bifosfonatos; Stockley's |

Deduplicação: `inr_down`+AVK só dispara quando o agente **não** é indutor do CYP3A4
(a carbamazepina + varfarina passa a mostrar um só cartão via CYP3A4; a flucloxacilina
mantém o seu).

---

## Ronda 6 — Digitálico + inibidor da P-gp (segurança)

Achado transversal: digoxina + amiodarona/dronedarona/verapamil/diltiazem caía em
**duas** moderadas (nó AV + P-gp), quando é um par **maior** — soma depressão do nó AV
com subida marcada dos níveis de digoxina (dronedarona ↑~2,5×).

| Regra nova | Nível | Conduta |
|---|---|---|
| `digital` + `pgpi` | **maior** | Reduzir a digoxina ~50 %; vigiar digoxinemia, FC e ECG |

Cobre também claritromicina + digoxina. Deduplicação: as regras do nó AV e da P-gp
ficam guardadas com `!both("digital","pgpi")` → um só cartão. Fonte: Stockley's; RCM
dronedarona/amiodarona; consenso.

---

## Ronda holística — INR graduado + hiponatremia

**(1) INR graduado.** O `inr_up` estava plano em moderada apesar de o efeito ser muito
heterogéneo. Corrigiu de passagem uma lacuna real: metronidazol/fluconazol/cotrimoxazol
só tinham `cyp2c9i` e **não geravam qualquer aviso** sobre a varfarina.

| Propriedade | Substâncias | Regra | Nível |
|---|---|---|---|
| `inr_up_forte` | metronidazol, fluconazol, cotrimoxazol, amiodarona | `inr_up_forte` + AVK | **maior** (vigiar INR 3–5 dias) |
| `inr_up` | claritromicina, eritromicina, quinolonas, etc. | `inr_up` + AVK | moderada |

**(2) Hiponatremia aditiva** — mecanismo antes ausente; das causas mais frequentes de
confusão/quedas no idoso em MGF.

| Propriedade | Substâncias | Regra | Nível |
|---|---|---|---|
| `hiponatremia` | ISRS, venlafaxina, duloxetina, HCTZ, indapamida, carbamazepina | 2 agentes | moderada (dosear Na⁺ 2–4 sem) |

Fonte: Stockley's / BNF; consenso (magnitude do par incerta).

Nota metodológica: os seis itens que o Science reabriu como "VERIFICAR" foram
confirmados no motor em produção — **já estavam todos corretos** desde as rondas
anteriores. Reabertos apenas por o Science não ter o export real das regras.

---

## Ronda 7 — Contagem de hiponatremia + SGLT2

| Alteração | Regra | Nível | Fonte |
|---|---|---|---|
| Contagem de hiponatremia | ≥ 3 agentes `hiponatremia` na lista | **maior** (dosear Na⁺ 3–7 dias); o par mantém-se moderada | Stockley's; De Picker 2014; consenso (limiar "3" pragmático) |
| Etiqueta | `hiponatremia` acrescentada à trazodona (SIADH) | — | — |
| `sglt2` (nova prop) | gliflozina + diurético | moderada (depleção de volume; regras de dia de doença) | RCM gliflozinas; ADA/EASD 2022; EMA |

O par de hiponatremia fica guardado com `hipoNa < 3`, para que ≥3 agentes mostrem um
único cartão maior em vez de várias moderadas.

**Não implementado como regra:** metronidazol + álcool. O motor cruza pares da lista de
medicação e o álcool não é um fármaco listado — não há par para disparar. A propriedade
`dissulfiram` já existe na substância como informação; seria um aviso ao nível do
fármaco se a interface passar a suportar notas por substância.

**Verificação (revisor):** a inconsistência apontada na folha do Science (omissão de
`pgpi` na claritromicina/eritromicina) **não afeta a ferramenta** — ambas já têm `pgpi`
no catálogo (o par digoxina + claritromicina dispara maior via `digital`+`pgpi`).

---

## Incertezas residuais (para validação por farmacologia clínica)

Direção consensual, limiar/magnitude a confirmar antes de qualquer validação:

- Limiar de contagem **"3"** na hiponatremia — pragmático, não validado por ensaio.
- Severidade **gliflozina + diurético** (moderada vs menor) — evidência observacional.
- Magnitude do par **bifosfonato + AINE** (mantido menor) — dados observacionais inconsistentes.
- Fronteira **forte/fraco** na serotonina (tramadol como forte; trazodona/tapentadol como fraco).

## Fora do âmbito do motor (pertencem à conduta, não a novas regras)

Interações dependentes de contexto que o cruzamento de propriedades não modela: dose,
função renal, timing das tomas na quelação, doença intercorrente.

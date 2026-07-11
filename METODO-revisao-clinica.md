# Método: validação clínica de regras e alertas (Revista)

Fluxo repetível, destilado de 7 rondas de revisão de interações + a validação completa dos
alertas renais. Serve para qualquer tranche nova do catálogo, qualquer motor de regras novo,
ou qualquer nova família de alertas (ex.: função hepática, gravidez, idoso).

O texto abaixo está escrito para poder ser colado como corpo de uma skill em
**Definições > Capacidades**.

---

## Princípio de fundo

O erro que este método previne não é o erro grosseiro — é o **falso positivo por etiqueta larga**.
Uma regra que dispara com uma propriedade demasiado genérica (`hipoglic` em vez de `sulfonilureia`,
`bbloq` em vez de `cyp2d6s`) gera alertas que o médico aprende a ignorar. Um alerta ignorado é
pior do que nenhum alerta, porque destrói a confiança nos que importam.

A solução, sempre a mesma: **graduar ou especificar**. Nunca tratar um mecanismo como binário
quando a evidência o gradua.

---

## O ciclo, em cinco passos

**1. Exportar o estado real.** Antes de pedir revisão, gerar um ficheiro com o estado
verdadeiro das regras/alertas — não descrevê-lo de memória. Sem isto, o revisor reabre coisas
que já estão corretas (aconteceu duas vezes: a regra do fibrato e o `pgpi` dos macrólidos foram
sinalizados como em falta quando já existiam).

**2. Rever por lotes, com prioridade explícita.** Nunca "revê tudo". Dividir por grupo ATC ou
por risco, e marcar numa coluna **Risco (Alto/Médio)** as linhas em que um erro causa dano.
O revisor começa por essas.

**3. Formato fixo de resposta.** Exigir sempre, por linha:

```
substância → propriedade/limiar → nível de severidade/conduta → fonte → nível de evidência
```

O **nível de evidência** (consenso / provável / incerto) é obrigatório. É o que permite decidir
onde é honesto pôr um número e onde é preciso hedge.

**4. Auditoria transversal.** Depois dos lotes, uma passagem sobre o conjunto inteiro à procura
de quatro coisas, por esta ordem:

- falsos positivos (severidade acima do que a evidência sustenta)
- falsos negativos (interação relevante não coberta)
- incoerências de calibração (mecanismos equivalentes com severidades diferentes)
- duplicações (dois cartões para o mesmo mecanismo no mesmo par)

**5. Changelog priorizado e executável.** Não aceitar prosa. Exigir uma tabela ordenada por peso
de segurança, com a alteração concreta a fazer. Aplicar, **testar** (regressão + novo
comportamento), publicar, verificar em produção.

---

## Regras de calibração aprendidas

- **Graduar em vez de dicotomizar.** QT por nível CredibleMeds; CYP3A4 por potência do inibidor
  × tipo de substrato; serotonina forte/fraco; nó AV potente/simples; INR forte/moderado.
- **Contar quando o risco é cumulativo.** Hiponatremia: um par é moderado, ≥ 3 agentes é maior.
  Mesmo princípio da carga anticolinérgica. Quando a contagem dispara, suprimir os alertas por
  par — um cartão maior, não N moderados.
- **Deduplicar com guardas.** Quando duas regras descrevem o mesmo mecanismo para o mesmo par,
  a mais específica ganha e a genérica leva uma guarda (`&& !jaDisparou`).
- **Uma associação de guideline não é um alerta maior.** Digoxina + beta-bloqueante é terapêutica
  na FA. IECA/ARA + antagonista da aldosterona é terapêutico na IC-FEr. Alertar como "maior"
  destrói credibilidade. O caso sintomático resolve-se na **conduta**, não na severidade.
- **Limiares demasiado altos são a principal fonte de ruído.** Foi o padrão dominante nos alertas
  renais (metoclopramida < 60, oxicodona < 60). Preferir remover um alerta a habituar o médico
  a ignorá-los.
- **Distinguir a indicação quando ela muda a conduta.** As gliflozinas foram o caso exemplar:
  a eficácia glicémica cai com TFG < 45, mas a nefroproteção mantém-se muito abaixo — um alerta
  cego levaria a suspender um fármaco que está a proteger o rim.

---

## Regras de honestidade

- Fármacos **retirados do mercado** saem do catálogo (ranitidina). Um alerta sobre um fármaco
  inexistente é ruído puro.
- Quando as fontes divergem, **dizer qual se segue e porquê** (nitrofurantoína < 45 vs < 30;
  metformina por eGFR vs por creatinina).
- Onde a magnitude é incerta, **escolher o nível mais baixo do intervalo** e registá-lo como
  incerteza (bifosfonato + AINE ficou em "menor").
- Manter uma lista viva de **incertezas residuais** — não são bugs, são a fronteira do que a
  evidência sustenta. Ver `CHANGELOG-clinico.md`.
- Nada disto é para uso clínico enquanto não passar por farmacologia clínica.

---

## Artefactos do ciclo

| Ficheiro | Papel |
|---|---|
| `data/build_catalogo.py` | Fonte de verdade do catálogo (ATC + propriedades) |
| `js/engine.js` | Motor de regras por mecanismo |
| `data/build_revisao.py` | Gera a folha de revisão das **interações** |
| `data/build_revisao_renal.py` | Gera a folha de revisão dos **alertas renais** |
| `CHANGELOG-clinico.md` | Registo de todas as rondas + incertezas residuais |

O gerador de folhas de revisão é o coração do método: colunas amarelas para o revisor preencher,
uma coluna **Risco** para ordenar, uma folha **"Em falta"** para o que não se antecipou, e uma
folha **Instruções** que diz ao revisor exatamente o que se lhe pede.

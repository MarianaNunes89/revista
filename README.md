# Revista

**O copiloto que lê a lista toda.** Protótipo de análise de interações medicamentosas e apoio à prescrição para o utente polimedicado, pensado para Medicina Geral e Familiar.

Ao contrário dos verificadores clássicos, que analisam um par de fármacos de cada vez, a Revista lê a **lista inteira** do utente e cruza **todos os pares** — mais os achados que só existem ao nível da lista (triplo whammy, carga de hiponatremia, conflito de INR).

**Site:** https://mariananunes89.github.io/revista/

> ⚠️ **Aviso.** Protótipo de demonstração. O catálogo e as regras são ilustrativos e não exaustivos. **Não se destina a uso clínico** e não substitui o juízo clínico, a verificação de alergias e contraindicações, nem as guidelines em vigor.

---

## Como funciona

O motor **não** tem regras par-a-par (não escalam: 194 substâncias = ~18.000 pares). Em vez disso:

1. Cada substância do catálogo traz **propriedades de mecanismo** (`qt_known`, `cyp3a4i_forte`, `seroton_forte`, `avnode_forte`, `kup`, `hiponatremia`, …).
2. Cerca de **40 regras genéricas** disparam quando duas propriedades se cruzam.

Um punhado de regras cobre assim milhares de pares. A severidade é **graduada**, não binária — foi o trabalho de 8 rondas de revisão clínica (ver [`CHANGELOG-clinico.md`](CHANGELOG-clinico.md)).

Além das interações, a lista sinaliza dois avisos por fármaco, **distintos pela forma, não pela cor**:

- **⚠ triângulo âmbar** — fármaco tipicamente de uso agudo/pontual, não habitual como medicação crónica (critérios STOPP).
- **selo `TFG`** — requer ajuste à função renal, com limiar e conduta concretos.

### Acessibilidade

A severidade nunca depende só da cor (WCAG 1.4.1): é codificada **três vezes** — texto (Maior/Moderada/Menor), contagem de pontos (●●● / ●● / ●) e padrão da barra (sólida / tracejada / pontilhada). A paleta evita a tríade vermelho-laranja-amarelo, que colapsa na deuteranopia.

---

## Estrutura

```
revista/
├── index.html                  # a aplicação (página única)
├── classes.html                # reencaminha para index.html (link antigo)
├── css/styles.css
├── js/
│   ├── catalog.js              # GERADO — não editar à mão
│   └── engine.js               # motor de regras por mecanismo
├── data/
│   ├── build_catalogo.py       # FONTE DE VERDADE do catálogo → gera js/catalog.js
│   ├── build_revisao.py        # gera a folha de revisão das interações
│   ├── build_revisao_renal.py  # gera a folha de revisão dos alertas renais
│   └── catalogo.json | .md     # saídas legíveis
├── tests/engine.test.mjs       # 32 testes do motor
├── CHANGELOG-clinico.md        # registo das rondas de revisão + incertezas residuais
└── METODO-revisao-clinica.md   # o método de validação, reutilizável
```

> **`js/catalog.js` é gerado.** Nunca o edites à mão — edita `data/build_catalogo.py` e regenera. O workflow de CI falha se o ficheiro gerado estiver dessincronizado da sua fonte.

---

## Desenvolvimento

Não há passo de compilação nem dependências para correr o site.

```bash
# correr localmente
python3 -m http.server 8000     # depois abrir http://localhost:8000

# correr os testes do motor (Node 18+)
node --test

# regenerar o catálogo depois de mexer em build_catalogo.py
cd data && python3 build_catalogo.py
```

Os testes cobrem as decisões clínicas validadas: se um deles quebrar, é uma regressão real, não um detalhe. Cada caso remete para uma ronda documentada no changelog.

### Adicionar um fármaco

Editar a lista `CLASSES` em `data/build_catalogo.py` (código ATC + DCI), atribuir-lhe as propriedades de mecanismo (via `PROPS` da classe, ou `OVERR` para exceções por substância), regenerar o catálogo e correr os testes.

### Adicionar uma regra de interação

Editar `js/engine.js`. Uma regra é um cruzamento de propriedades — pensar sempre se a severidade deve ser **graduada** em vez de binária, e se pode duplicar um cartão já existente (ver as guardas de deduplicação no código).

---

## Publicação

O site é publicado automaticamente no GitHub Pages a cada push para `main` (workflow em `.github/workflows/deploy.yml`). O workflow `test.yml` corre os testes e verifica que o catálogo gerado está em dia.

---

## Roadmap

1. **Contexto do doente** — TFG e idade, para os alertas passarem de informação a decisão (em curso).
2. Colar a lista de medicação em texto livre (em vez de a escrever fármaco a fármaco).
3. Exportar a revisão para o processo clínico.
4. Base de interações validada e versionada (INFARMED/Infomed, Stockley's) — substitui o catálogo curado sem tocar no motor.
5. Alergias, contraindicações e função hepática.
6. Integração no ponto de prescrição (SClínico / PEM) e percurso regulatório (software como dispositivo médico, MDR Classe IIa a confirmar).

---

Conceito e desenvolvimento: **Mariana S. N. Alves** · Medicina Geral e Familiar

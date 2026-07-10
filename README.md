# Revista

**O copiloto que lê a lista toda.** Protótipo de análise de interações medicamentosas e apoio à prescrição para o utente polimedicado, pensado para Medicina Geral e Familiar.

Ao contrário dos verificadores clássicos, que analisam um par de fármacos de cada vez, a Revista lê a **lista inteira** do utente, cruza **todos os pares** e fundamenta a próxima escolha de prescrição sobre essa lista real.

> ⚠️ **Aviso.** Isto é um protótipo de demonstração. A base de interações e as regras de seleção são ilustrativas e não exaustivas, construídas a partir de farmacologia clássica bem documentada. **Não se destina a uso clínico** e não substitui o juízo clínico, a verificação de alergias e contraindicações, nem as guidelines em vigor.

---

## O que faz

- **Matriz de interações** — cruza todos os `n(n−1)/2` pares da medicação e mostra a severidade de cada um (maior / moderada / menor).
- **Interações encontradas** — para cada par, o mecanismo farmacológico e a conduta clínica sugerida.
- **Advisor de prescrição** — dado o perfil atual do utente, ordena as opções mais seguras para: iniciar uma medicação crónica (antidiabético, beta-bloqueante, anticoagulante, anti-histamínico) e escolher a antibioterapia.

---

## Estrutura do projeto

```
revista/
├── index.html          # estrutura da página
├── css/
│   └── styles.css       # todo o estilo
├── js/
│   ├── data.js          # base de conhecimento: catálogo de fármacos + regras de interação
│   └── app.js           # motor de análise + interface
├── .github/
│   └── workflows/
│       └── deploy.yml   # publicação automática no GitHub Pages
├── LICENSE
└── README.md
```

A separação entre `data.js` (conhecimento clínico) e `app.js` (lógica) é propositada: em produção, a camada de dados é substituída por uma base validada e versionada sem tocar no motor.

---

## Como correr localmente

Não há passo de compilação nem dependências. Duas opções:

1. **A mais simples** — abrir o ficheiro `index.html` diretamente no browser (duplo clique).
2. **Com um servidor local** (recomendado, evita restrições de alguns browsers):
   ```bash
   # com Python (já vem instalado na maioria dos sistemas)
   python3 -m http.server 8000
   # depois abrir http://localhost:8000 no browser
   ```

---

## Como pôr isto no GitHub (passo a passo)

Se já não mexes no GitHub há algum tempo, o caminho mais simples é pela **interface web**, sem linha de comandos:

1. Vai a [github.com](https://github.com) e faz login (ou cria conta).
2. Carrega no **+** no canto superior direito → **New repository**.
3. Dá-lhe um nome (ex.: `revista`), deixa **Public**, e cria o repositório (**não** adiciones README, para não haver conflito com este).
4. Na página do repositório vazio, carrega em **uploading an existing file**.
5. Arrasta para lá **o conteúdo desta pasta** (`index.html`, a pasta `css`, a pasta `js`, `LICENSE`, `README.md`). O upload web mantém as subpastas.
6. Carrega em **Commit changes**.

### Ativar o site live (GitHub Pages)

Este repositório já inclui um workflow que publica o site automaticamente. Depois do upload:

1. No repositório, vai a **Settings** → **Pages** (menu lateral).
2. Em **Build and deployment → Source**, escolhe **GitHub Actions**.
3. Feito. A cada alteração que faças, o site é republicado sozinho. Encontras o link em **Settings → Pages** (algo como `https://o-teu-utilizador.github.io/revista/`).

> Se preferires a linha de comandos, o fluxo é o habitual: `git init`, `git add .`, `git commit -m "primeira versão"`, `git branch -M main`, `git remote add origin <url>`, `git push -u origin main`.

---

## Como estender

- **Adicionar um fármaco:** acrescenta uma entrada a `DRUGS` em `js/data.js`.
- **Adicionar uma interação:** acrescenta uma entrada a `RULES`, com a chave formada pelos dois IDs por **ordem alfabética**, separados por `|` (ex.: `"amiodarona|varfarina"`).

---

## Roadmap (visão)

1. Base de interações validada (substituir o conteúdo ilustrativo por fonte reconhecida e versionada).
2. Camada de linguagem natural para pergunta em texto livre.
3. Integração no ponto de prescrição (EHR / SClínico).
4. Validação clínica e percurso regulatório (software como dispositivo médico, MDR).

---

Conceito e desenvolvimento: **Mariana S. N. Alves** · Medicina Geral e Familiar

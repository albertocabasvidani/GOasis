# 🎸 Progetto GOasis - Setup Completo e Documentazione

**Data:** 15 Agosto 2024  
**Progetto:** Sito web tribute band GOasis con integrazione Notion  
**Repository:** https://github.com/albertocabasvidani/GOasis  
**Sito Live:** https://albertocabasvidani.github.io/GOasis/

---

## 📋 Panoramica Progetto

Creazione di un sito web per la tribute band degli Oasis "GOasis" con:
- ✅ Sito statico HTML/CSS/JS responsive
- ✅ Deploy automatico su GitHub Pages
- ✅ Integrazione Notion per gestione concerti
- ✅ Aggiornamento automatico giornaliero
- ✅ Workflow GitHub Actions

---

## 🖥️ Configurazione Ambiente Windows/WSL

### Sistema Operativo
- **OS:** Windows con WSL2 (Linux 5.15.167.4-microsoft-standard-WSL2)
- **Distribuzione WSL:** Ubuntu
- **Directory di lavoro:** `/mnt/c/claude-code/Sito GOasis`

### Configurazione Git
```bash
# Configurazione utente Git
git config --global user.email "albertocabasvidani@gmail.com"
git config --global user.name "albertocabasvidani"

# Configurazione credential helper per salvare credenziali
git config --global credential.helper store
```

### Configurazione SSH per GitHub

#### Generazione chiave SSH
```bash
# Crea directory SSH
mkdir -p ~/.ssh

# Genera nuova chiave SSH ED25519
ssh-keygen -t ed25519 -C "albertocabasvidani@gmail.com" -f ~/.ssh/id_ed25519 -N ""

# Mostra chiave pubblica da aggiungere a GitHub
cat ~/.ssh/id_ed25519.pub
```

**Output chiave pubblica:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHbCSQ83FhK7oTZDCkjUG/OFZHTw0ErkjMfoXKyoaS0N albertocabasvidani@gmail.com
```

#### Configurazione GitHub
1. Vai su: https://github.com/settings/keys
2. Clicca "New SSH key"
3. **Title:** "Claude Code WSL"
4. **Key type:** Authentication Key
5. **Key:** Incolla la chiave pubblica sopra
6. Clicca "Add SSH key"

#### Test connessione SSH
```bash
# Aggiungi GitHub ai known hosts
ssh-keyscan github.com >> ~/.ssh/known_hosts

# Test connessione (deve rispondere con successo)
ssh -T git@github.com
```

**Risposta attesa:**
```
Hi albertocabasvidani! You've successfully authenticated, but GitHub does not provide shell access.
```

---

## 🚀 Setup Repository GitHub

### Creazione e Configurazione
```bash
# Inizializza repository Git
git init

# Configura remote SSH (NON HTTPS per Claude Code)
git remote add origin git@github.com:albertocabasvidani/GOasis.git

# Setup branch principale
git branch -M main

# Primo commit e push
git add .
git commit -m "Initial commit: Setup GOasis tribute band website"
git push -u origin main
```

### Struttura Repository Creata
```
GOasis/
├── index.html                 # Pagina principale
├── style.css                  # Styling responsive
├── package.json               # Dipendenze npm
├── package-lock.json          # Lock file dependencies
├── .gitignore                 # File da ignorare
├── README.md                  # Documentazione progetto
├── data/
│   └── concerts.json          # Dati concerti (generato automaticamente)
├── scripts/
│   └── fetch-concerts.js      # Script fetch da Notion API
├── .github/workflows/
│   ├── pages.yml              # Deploy GitHub Pages
│   └── update-concerts.yml    # Aggiornamento concerti
└── docs/
    └── PROGETTO_GOASIS_SETUP_COMPLETO.md  # Questo file
```

---

## 🔧 Configurazione GitHub Pages

### Impostazioni Repository
1. **Vai su:** https://github.com/albertocabasvidani/GOasis/settings/pages
2. **Source:** GitHub Actions (NON "Deploy from branch")
3. **Workflow:** Configurato automaticamente in `.github/workflows/pages.yml`

### Workflow GitHub Pages (`.github/workflows/pages.yml`)
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      pages: write
      id-token: write
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Setup Pages
      uses: actions/configure-pages@v4
    
    - name: Upload artifact
      uses: actions/upload-pages-artifact@v3
      with:
        path: '.'
    
    - name: Deploy to GitHub Pages
      id: deployment
      uses: actions/deploy-pages@v4
```

---

## 📝 Integrazione Notion

### Setup Notion Integration

#### Creazione Integration
1. **Vai su:** https://www.notion.so/my-integrations
2. **Clicca:** "New integration"
3. **Nome:** "GOasis Concerts"
4. **Workspace:** Seleziona il tuo workspace
5. **Copia il token** (inizia con `secret_...`)

#### Condivisione Database
1. **Apri il database concerti in Notion**
2. **Clicca:** tre puntini (⋯) in alto a destra
3. **Seleziona:** "Connections" → "Add connections"
4. **Cerca e aggiungi:** "GOasis Concerts"

#### Struttura Database Richiesta
Il database Notion deve avere questi campi:

| Nome Campo | Tipo | Descrizione |
|------------|------|-------------|
| **Locale** | Title | Nome del venue (campo principale) |
| **Data** | Date | Data del concerto |
| **Ora** | Text | Orario del concerto |
| **Luogo** | Text | Località/città del venue |
| **Città** | Text | Città (opzionale) |
| **Indirizzo** | Text | Indirizzo completo (opzionale) |
| **Note** | Text | Note aggiuntive (opzionale) |

#### GitHub Secrets Configuration
**Vai su:** https://github.com/albertocabasvidani/GOasis/settings/secrets/actions

**Aggiungi questi secrets:**
- **NOTION_API_KEY:** `secret_...` (token dalla integration)
- **NOTION_DATABASE_ID:** `5fe69fd43f1740b0b2e94b9b61a863a4` (ID del database)

### Script Fetch Concerti (`scripts/fetch-concerts.js`)

#### Funzionalità
- ✅ Connessione automatica a Notion API
- ✅ Filtro concerti futuri (da oggi in poi)
- ✅ Ordinamento per data crescente
- ✅ Formattazione dati per frontend
- ✅ Salvataggio in `data/concerts.json`

#### Dipendenze npm (`package.json`)
```json
{
  "name": "goasis-website",
  "version": "1.0.0",
  "description": "Sito web GOasis Tribute Band",
  "scripts": {
    "fetch-concerts": "node scripts/fetch-concerts.js"
  },
  "dependencies": {
    "@notionhq/client": "^2.2.14"
  }
}
```

### Workflow Aggiornamento Automatico (`.github/workflows/update-concerts.yml`)

#### Trigger
- ⏰ **Giornaliero:** Ogni giorno alle 6:00 UTC (7:00-8:00 Italia)
- 🔄 **Manuale:** Workflow dispatch
- 📝 **Push:** Quando si modifica `scripts/fetch-concerts.js`

#### Configurazione Workflow
```yaml
name: Update Concerts from Notion

on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'scripts/fetch-concerts.js'

jobs:
  update-concerts:
    runs-on: ubuntu-latest
    
    permissions:
      contents: write  # IMPORTANTE: Permesso per commit automatici
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Fetch concerts from Notion
      env:
        NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
        NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
      run: npm run fetch-concerts
    
    - name: Check for changes
      id: git-check
      run: |
        git diff --exit-code data/concerts.json || echo "changes=true" >> $GITHUB_OUTPUT
    
    - name: Commit and push if changed
      if: steps.git-check.outputs.changes == 'true'
      run: |
        git config --local user.email "github-actions[bot]@users.noreply.github.com"
        git config --local user.name "github-actions[bot]"
        git add data/concerts.json
        git commit -m "Update concerts from Notion [skip ci]"
        git push
```

---

## 🎨 Struttura Frontend

### File Principali

#### `index.html`
- ✅ Struttura HTML5 responsive
- ✅ Navigation bar con scroll smooth
- ✅ Hero section con brand identity
- ✅ Sezioni: Band, Concerti, Gallery, Contatti
- ✅ Caricamento dinamico concerti via JavaScript

#### `style.css`
- ✅ Design responsive mobile-first
- ✅ Color scheme: Orange (#ff6b35) + Dark greys
- ✅ Grid layouts per member cards e gallery
- ✅ Ottimizzazioni spazio verticale
- ✅ Styling specifico per concerti

#### JavaScript Integration
**Caricamento concerti dinamico:**
```javascript
async function loadConcerts() {
    try {
        const response = await fetch('data/concerts.json');
        const concerts = await response.json();
        
        // Genera HTML per ogni concerto
        const concertsHTML = concerts.map(concert => `
            <div class="concert-item">
                <div class="date">
                    <span class="day">${concert.day}</span>
                    <span class="month">${concert.month}</span>
                </div>
                <div class="details">
                    <h3>${concert.venue}</h3>
                    ${concert.location ? `<p class="location">${concert.location}</p>` : ''}
                    ${concert.city ? `<p class="city">${concert.city}</p>` : ''}
                    <p class="time">Ore ${concert.time}</p>
                    ${concert.notes ? `<p class="notes">${concert.notes}</p>` : ''}
                </div>
            </div>
        `).join('');
        
        document.getElementById('concert-list').innerHTML = concertsHTML;
    } catch (error) {
        // Fallback per quando il file non esiste
        console.error('Errore caricamento concerti:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadConcerts);
```

---

## 🛠️ Troubleshooting e Problemi Risolti

### Problema 1: Credential Git
**Errore:** `fatal: could not read Password`  
**Soluzione:** Configurato SSH invece di HTTPS per Claude Code

### Problema 2: Workflow npm cache
**Errore:** `Dependencies lock file is not found`  
**Soluzione:** Aggiunto `package-lock.json` e rimosso cache npm

### Problema 3: Permissions GitHub Actions
**Errore:** `Permission denied to github-actions[bot]`  
**Soluzione:** Aggiunto `permissions: contents: write` al workflow

### Problema 4: Notion Date Filter
**Errore:** Date passate mostrate come future  
**Soluzione:** Verificato formato date Notion e filtro `on_or_after`

### Problema 5: Notion Database ID
**Errore:** `should be a valid uuid`  
**Soluzione:** Secret GitHub era vuoto, aggiunto ID corretto

---

## 📊 Risultati Finali

### Funzionalità Implementate
- ✅ **Sito responsive** con design professionale
- ✅ **Deploy automatico** su GitHub Pages
- ✅ **Integrazione Notion** per gestione concerti
- ✅ **Aggiornamento automatico** giornaliero
- ✅ **Filtro date** per concerti futuri
- ✅ **Display ottimizzato** con meno scroll
- ✅ **Campo luogo** per ogni concerto

### URLs Importanti
- **Sito Live:** https://albertocabasvidani.github.io/GOasis/
- **Repository:** https://github.com/albertocabasvidani/GOasis
- **GitHub Actions:** https://github.com/albertocabasvidani/GOasis/actions
- **Settings Secrets:** https://github.com/albertocabasvidani/GOasis/settings/secrets/actions

### Dati Attuali
**Concerti caricati da Notion (solo futuri):**
1. 23 agosto 2025 - Mulin di Braida
2. 29 agosto 2025 - Eccolo
3. 30 agosto 2025 - All'Invidia
4. 12 settembre 2025 - Novecento
5. 10 ottobre 2025 - Garage Music Club

---

## 🔄 Utilizzo per Progetti Futuri

### Template Repository
Questo setup può essere riutilizzato per:
- ✅ Siti web con contenuto dinamico da Notion
- ✅ Progetti che richiedono deploy automatico
- ✅ Integrazioni API con workflow GitHub Actions
- ✅ Siti di eventi/concerti/attività

### Checklist Setup Rapido
1. [ ] Clona repository come template
2. [ ] Configura SSH su nuova macchina
3. [ ] Crea nuova Notion integration
4. [ ] Aggiorna GitHub secrets
5. [ ] Modifica contenuti e styling
6. [ ] Test workflow e deploy

### Comandi Utili
```bash
# Clone e setup
git clone git@github.com:albertocabasvidani/NUOVO-PROGETTO.git
cd NUOVO-PROGETTO

# Test locale concerti
npm install
export NOTION_API_KEY="secret_..."
export NOTION_DATABASE_ID="database_id"
npm run fetch-concerts

# Deploy manuale
git add -A
git commit -m "Update: ..."
git push origin main
```

---

## 📚 Documentazione di Riferimento

### Link Utili
- **Notion API:** https://developers.notion.com/
- **GitHub Actions:** https://docs.github.com/en/actions
- **GitHub Pages:** https://docs.github.com/en/pages
- **SSH GitHub:** https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### File di Configurazione Critici
- `.github/workflows/update-concerts.yml`
- `scripts/fetch-concerts.js`
- `package.json` e `package-lock.json`
- `.gitignore`

---

**🎸 Fine Documentazione - Progetto GOasis Completato con Successo! 🎸**
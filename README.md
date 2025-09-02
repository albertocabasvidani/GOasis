# GOasis - Tribute Band Website

Sito web della tribute band italiana GOasis, specializzata nei brani degli Oasis.

🎸 Live Music | 🎤 Tribute Shows | 🇬🇧 Britpop | 🤖 Automated Content

## Caratteristiche

- **Sito statico** con gestione contenuti automatizzata
- **Integrazione Notion** per la gestione concerti
- **Automazione GitHub Actions** per aggiornamenti quotidiani
- **Generazione automatica immagini Facebook**
- **Sincronizzazione video Facebook → YouTube**
- **Mappa interattiva** dei concerti passati
- **Gallery fotografica** responsive
- **Design mobile-first**

## Setup

### Prerequisiti
```bash
# Node.js 18+
node --version

# Git LFS per i video temporanei
git lfs install
```

### Installazione
```bash
# Clona il repository
git clone https://github.com/albertocabasvidani/GOasis.git
cd GOasis

# Installa dipendenze
npm install

# Configura Git LFS
git lfs install
```

### Variabili d'ambiente (GitHub Secrets)

#### Per i concerti (Notion)
- `NOTION_API_KEY`: Token API Notion
- `NOTION_DATABASE_ID`: ID database concerti

#### Per Facebook
- `FB_ACCESS_TOKEN`: Token accesso pagina Facebook
- `FB_PAGE_ID`: ID pagina Facebook

#### Per YouTube (nuovo)
- `YOUTUBE_CLIENT_ID`: Client ID Google OAuth2
- `YOUTUBE_CLIENT_SECRET`: Client Secret Google OAuth2  
- `YOUTUBE_REFRESH_TOKEN`: Refresh Token OAuth2

## Comandi

### Sviluppo
```bash
# Server locale
python3 -m http.server 8000
# oppure
npx serve .

# Fetch concerti da Notion
npm run fetch-concerts

# Genera dati mappa
npm run fetch-map

# Genera immagini Facebook
npm run generate-fb-posts

# Posta su Facebook
npm run post-to-facebook

# Sincronizza video FB → YouTube
npm run sync-fb-youtube
```

### Deploy
Il sito si aggiorna automaticamente su GitHub Pages ad ogni push su `main`.

## Automazioni GitHub Actions

### 1. Aggiornamento Concerti (`update-concerts.yml`)
- **Frequenza**: Ogni giorno alle 6:00 UTC
- **Funzione**: Sincronizza concerti da Notion
- **Output**: `data/concerts.json`

### 2. Mappa Concerti (`update-concert-map.yml`)
- **Frequenza**: Settimanale (domenica)
- **Funzione**: Aggiorna coordinate concerti passati
- **Output**: `data/past-concerts-map.json`

### 3. Immagini Facebook (`generate-fb-images.yml`)
- **Frequenza**: Ogni giorno alle 7:00 UTC
- **Funzione**: Genera immagini promozionali
- **Output**: `img/fb-post-concerts-*.png`

### 4. Sincronizzazione Video (`sync-fb-youtube.yml`) ⭐ **NUOVO**
- **Frequenza**: Ogni giorno alle 9:00 UTC
- **Funzione**: Trasferisce video da Facebook a YouTube
- **Storage**: Git LFS temporaneo (auto-cleanup)
- **Output**: `data/videos.json`
- **Limiti**: Video <800MB, automaticamente scartati quelli più grandi

## Architettura Video Sync

### Flusso di lavoro
1. **Fetch** video da Facebook Graph API
2. **Download** temporaneo in `temp-video/` (Git LFS)
3. **Upload** su YouTube con metadati
4. **Cleanup** immediato del file temporaneo
5. **Save** metadati in `data/videos.json`

### Sicurezza LFS
- Limiti: 1GB storage/mese (gratuito)
- File temporanei eliminati immediatamente post-upload
- Storage netto: ~0 (solo transit)
- Filtro automatico video >800MB

## Struttura File

```
/
├── .github/workflows/       # Automazioni
├── data/                   # JSON dinamici
├── img/                    # Immagini e foto
├── scripts/               # Script Node.js
├── temp-video/            # Storage video temporaneo (LFS)
├── index.html             # Single page application
├── style.css              # Styles
└── package.json           # Dipendenze
```

## Configurazione YouTube OAuth2

Per configurare l'integrazione YouTube:

1. **Google Cloud Console**:
   - Crea progetto Google Cloud
   - Abilita YouTube Data API v3
   - Crea credenziali OAuth 2.0

2. **Primo setup** (locale):
   ```bash
   node scripts/youtube-oauth-setup.js
   ```

3. **Aggiungi secrets** su GitHub:
   - `YOUTUBE_CLIENT_ID`
   - `YOUTUBE_CLIENT_SECRET`  
   - `YOUTUBE_REFRESH_TOKEN`

## Sviluppo

### Pattern di sviluppo
- **No framework JS**: Vanilla JavaScript
- **JSON come database**: File in `data/`
- **Mobile-first**: Design responsive
- **Automazione**: GitHub Actions per i contenuti

## Licenza

Progetto open source per la tribute band GOasis.
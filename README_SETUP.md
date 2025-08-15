# Setup Integrazione Notion

## Configurazione API Notion

### 1. Crea una Notion Integration
1. Vai su https://www.notion.so/my-integrations
2. Clicca "New integration"
3. Nome: "GOasis Concerts"
4. Seleziona il workspace
5. Copia la "Internal Integration Token" (inizia con `secret_`)

### 2. Condividi il Database con l'Integration
1. Apri il database dei concerti in Notion
2. Clicca sui tre puntini in alto a destra
3. Connections → Add connections
4. Cerca e seleziona "GOasis Concerts"

### 3. Ottieni l'ID del Database
1. Apri il database in Notion
2. Copia l'URL (es: https://www.notion.so/albertocabasvidani/5fe69fd43f1740b0b2e94b9b61a863a4?v=...)
3. L'ID è la parte dopo notion.so/username/ e prima del ? 
   Nel tuo caso: `5fe69fd43f1740b0b2e94b9b61a863a4`

## Configurazione GitHub Secrets

1. Vai su https://github.com/albertocabasvidani/GOasis/settings/secrets/actions
2. Aggiungi due nuovi secrets:
   - **NOTION_API_KEY**: La token dell'integration (secret_...)
   - **NOTION_DATABASE_ID**: L'ID del database (5fe69fd43f1740b0b2e94b9b61a863a4)

## Struttura Database Notion

Il database deve avere questi campi:
- **Data** (Date): Data del concerto
- **Ora** (Text): Orario del concerto
- **Locale** (Title): Nome del locale
- **Città** (Text): Città
- **Indirizzo** (Text): Indirizzo completo
- **Note** (Text): Note aggiuntive (opzionale)

## Test Locale

Per testare localmente:
```bash
npm install
export NOTION_API_KEY="secret_..."
export NOTION_DATABASE_ID="5fe69fd43f1740b0b2e94b9b61a863a4"
npm run fetch-concerts
```

## Funzionamento

- Il workflow GitHub Actions si esegue ogni giorno alle 7:00
- Recupera i concerti futuri da Notion
- Aggiorna il file `data/concerts.json`
- Il sito carica dinamicamente i concerti da questo file
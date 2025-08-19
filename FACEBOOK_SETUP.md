# Setup Facebook Automation

Per automatizzare i post su Facebook, devi configurare alcuni elementi:

## 1. Crea un'App Facebook

1. Vai su [Facebook Developers](https://developers.facebook.com/)
2. Clicca "Create App" → "Business" → "Next"
3. Inserisci nome app (es. "GOasis Website Automation")
4. Completa la creazione

## 2. Configura le Autorizzazioni

Nell'app Facebook:
1. Vai su "App roles" → "Roles"
2. Aggiungi te stesso come "Administrator"
3. Vai su "Products" → "Facebook Login" → "Add Product"
4. In "Valid OAuth Redirect URIs" aggiungi: `https://developers.facebook.com/tools/explorer/callback`

## 3. Ottieni i Token

### Page Access Token:
1. Vai su [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Seleziona la tua app nel menu a tendina
3. Clicca "Generate Access Token"
4. Seleziona la tua pagina Facebook
5. Assicurati di avere questi permessi:
   - `pages_manage_posts`
   - `pages_read_engagement` 
   - `pages_show_list`
6. Copia il token generato

### Page ID:
1. Vai sulla tua pagina Facebook
2. Clicca "About" → "Page Transparency"
3. Copia il "Page ID"

## 4. Configura GitHub Secrets

Nel tuo repository GitHub:
1. Vai su "Settings" → "Secrets and variables" → "Actions"
2. Aggiungi questi secrets:
   - `FB_PAGE_ACCESS_TOKEN`: Il token della pagina
   - `FB_PAGE_ID`: L'ID della pagina

## 5. Abilita l'Automazione (Opzionale)

Nel repository GitHub:
1. Vai su "Settings" → "Secrets and variables" → "Actions" → "Variables"
2. Crea una variabile `ENABLE_FB_POSTING` con valore `true`

Se non imposti questa variabile, le immagini verranno generate ma non postate automaticamente.

## 6. Test Manuale

Per testare localmente:
```bash
export FB_PAGE_ACCESS_TOKEN="il_tuo_token"
export FB_PAGE_ID="il_tuo_page_id"
npm run post-to-facebook
```

## Note Importanti

- Il token ha una scadenza, dovrai rinnovarlo periodicamente
- Facebook ha limiti sui post automatici, il sistema include pause tra i post
- Puoi sempre disabilitare l'automazione rimuovendo la variabile `ENABLE_FB_POSTING`
- Le immagini vengono sempre generate, il posting è opzionale
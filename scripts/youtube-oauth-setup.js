const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const open = require('open');

// Configura le tue credenziali qui (temporaneamente per setup)
const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube'
];

async function getRefreshToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Forces refresh token
  });

  console.log('🔑 YouTube OAuth Setup');
  console.log('====================\n');

  // Create a server to handle the callback
  const server = http.createServer(async (req, res) => {
    if (req.url.indexOf('/oauth2callback') > -1) {
      const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
      const code = qs.get('code');
      
      if (code) {
        try {
          const { tokens } = await oauth2Client.getToken(code);
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <h1>✅ Autorizzazione completata!</h1>
            <p>Puoi chiudere questa finestra e tornare al terminale.</p>
          `);
          
          console.log('\n🎉 TOKENS OTTENUTI:');
          console.log('===================\n');
          console.log('Aggiungi questi secrets su GitHub:');
          console.log(`YOUTUBE_CLIENT_ID=${CLIENT_ID}`);
          console.log(`YOUTUBE_CLIENT_SECRET=${CLIENT_SECRET}`);
          console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
          console.log('\n⚠️  IMPORTANTE: Salva il refresh_token, non scade!');
          
          server.close();
        } catch (error) {
          console.error('❌ Errore ottenimento token:', error.message);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>❌ Errore durante l\'autorizzazione</h1>');
          server.close();
        }
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>❌ Codice di autorizzazione mancante</h1>');
      }
    }
  });

  server.listen(3000, () => {
    console.log('🌐 Server di callback in ascolto su http://localhost:3000');
    console.log('🔗 Apertura browser per autorizzazione...\n');
    open(authUrl);
  });
}

// Controlla che le credenziali siano configurate
if (CLIENT_ID === 'YOUR_CLIENT_ID' || CLIENT_SECRET === 'YOUR_CLIENT_SECRET') {
  console.error('❌ ERRORE: Configura CLIENT_ID e CLIENT_SECRET nel file');
  console.log('\n📋 ISTRUZIONI:');
  console.log('1. Vai su https://console.cloud.google.com/');
  console.log('2. Crea credenziali OAuth 2.0 tipo "Applicazione web"');
  console.log('3. Aggiungi redirect URI: http://localhost:3000/oauth2callback');
  console.log('4. Sostituisci CLIENT_ID e CLIENT_SECRET in questo file');
  console.log('5. Rilancia: node scripts/youtube-oauth-setup.js\n');
  process.exit(1);
}

getRefreshToken().catch(console.error);
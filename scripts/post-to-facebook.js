const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function postToFacebook() {
  try {
    console.log('Starting Facebook post automation...');
    
    // Verifica che le variabili di ambiente necessarie siano presenti
    const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
    const pageId = process.env.FB_PAGE_ID;
    
    if (!pageAccessToken || !pageId) {
      throw new Error('Missing required environment variables: FB_PAGE_ACCESS_TOKEN and FB_PAGE_ID');
    }
    
    // Trova tutte le immagini generate
    const imgDir = path.join(__dirname, '..', 'img');
    const files = await fs.readdir(imgDir);
    const fbPostImages = files.filter(file => file.startsWith('fb-post-') && file.endsWith('.png'));
    
    if (fbPostImages.length === 0) {
      console.log('No Facebook post images found to upload');
      return;
    }
    
    console.log(`Found ${fbPostImages.length} images to post`);
    
    // Carica i concerti per generare la caption
    const concertsPath = path.join(__dirname, '..', 'data', 'concerts.json');
    const concertsData = await fs.readFile(concertsPath, 'utf8');
    const concerts = JSON.parse(concertsData);
    
    // Genera caption per il post
    const caption = generateCaption(concerts);
    
    // Posta ogni immagine
    for (let i = 0; i < fbPostImages.length; i++) {
      const imagePath = path.join(imgDir, fbPostImages[i]);
      const imageNumber = i + 1;
      const totalImages = fbPostImages.length;
      
      console.log(`Posting image ${imageNumber} of ${totalImages}...`);
      
      const imageCaption = totalImages > 1 
        ? `${caption}\n\n📸 Immagine ${imageNumber} di ${totalImages}`
        : caption;
      
      await postImageToFacebook(imagePath, imageCaption, pageId, pageAccessToken);
      
      // Pausa tra i post per evitare rate limiting
      if (i < fbPostImages.length - 1) {
        console.log('Waiting 30 seconds before next post...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    console.log('All images posted to Facebook successfully!');
    
  } catch (error) {
    console.error('Error posting to Facebook:', error);
    throw error;
  }
}

async function postImageToFacebook(imagePath, caption, pageId, accessToken) {
  try {
    // Leggi il file immagine
    const imageBuffer = await fs.readFile(imagePath);
    
    // Crea FormData per l'upload
    const formData = new FormData();
    formData.append('source', imageBuffer, {
      filename: path.basename(imagePath),
      contentType: 'image/png'
    });
    formData.append('message', caption);
    formData.append('access_token', accessToken);
    
    // Endpoint per postare foto su una pagina Facebook
    const url = `https://graph.facebook.com/v19.0/${pageId}/photos`;
    
    // Effettua la richiesta
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Facebook API error: ${result.error?.message || 'Unknown error'}`);
    }
    
    console.log(`Image posted successfully! Post ID: ${result.id}`);
    return result;
    
  } catch (error) {
    console.error(`Error posting image ${imagePath}:`, error);
    throw error;
  }
}

function generateCaption(concerts) {
  const upcoming = concerts.filter(concert => {
    const concertDate = new Date(`2024-${concert.month.padStart(2, '0')}-${concert.day.padStart(2, '0')}`);
    return concertDate >= new Date();
  });
  
  if (upcoming.length === 0) {
    return '🎸 GOasis - Tribute Band Oasis\n\nStay tuned for upcoming concerts! 🎵\n\n#GOasis #Oasis #TributeBand #LiveMusic';
  }
  
  const caption = [
    '🎸 GOasis - Prossimi Concerti',
    '',
    'Non perdere i nostri prossimi live! 🎵',
    '',
    ...upcoming.slice(0, 3).map(concert => {
      const acoustic = concert.acoustic ? ' (Acustico)' : '';
      return `📅 ${concert.day}/${concert.month} - ${concert.venue}${acoustic}, ${concert.location}`;
    }),
    ''
  ];
  
  if (upcoming.length > 3) {
    caption.push('...e altri concerti in programma!');
    caption.push('');
  }
  
  caption.push('#GOasis #Oasis #TributeBand #LiveMusic #Concerti');
  
  return caption.join('\n');
}

// Esegui se chiamato direttamente
if (require.main === module) {
  postToFacebook()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { postToFacebook };
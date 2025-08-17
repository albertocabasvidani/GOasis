const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs').promises;
const path = require('path');

async function generateFacebookPosts() {
  try {
    console.log('Reading concerts data...');
    
    // Debug: verifica che le directory esistano
    const imgDir = path.join(__dirname, '..', 'img');
    console.log('Checking img directory:', imgDir);
    
    try {
      const imgFiles = await fs.readdir(imgDir);
      console.log('Files in img directory:', imgFiles);
    } catch (error) {
      console.error('Error reading img directory:', error);
    }
    
    // Leggi i concerti
    const concertsPath = path.join(__dirname, '..', 'data', 'concerts.json');
    const concertsData = await fs.readFile(concertsPath, 'utf8');
    const concerts = JSON.parse(concertsData);
    
    console.log(`Found ${concerts.length} concerts`);
    
    // Dividi i concerti secondo le regole
    const concertGroups = splitConcerts(concerts);
    
    console.log(`Creating ${concertGroups.length} images`);
    
    // Genera un'immagine per ogni gruppo
    for (let i = 0; i < concertGroups.length; i++) {
      const group = concertGroups[i];
      const imagePath = path.join(__dirname, '..', 'img', `fb-post-${i + 1}.png`);
      
      console.log(`Generating image ${i + 1} with ${group.length} concerts...`);
      await generateImage(group, imagePath, i + 1, concertGroups.length);
    }
    
    console.log('Facebook post images generated successfully!');
    
  } catch (error) {
    console.error('Error generating Facebook posts:', error);
    throw error;
  }
}

function splitConcerts(concerts) {
  const total = concerts.length;
  
  if (total < 6) {
    // Tutti in una immagine se meno di 6
    return [concerts];
  }
  
  // Se 6 o più, dividi in gruppi
  const groups = [];
  let remaining = [...concerts];
  
  while (remaining.length > 0) {
    if (remaining.length <= 5) {
      // Se rimangono 5 o meno, metti tutto in un gruppo
      groups.push(remaining);
      break;
    } else if (remaining.length === 6) {
      // Se rimangono esattamente 6, dividi 3-3
      groups.push(remaining.slice(0, 3));
      groups.push(remaining.slice(3));
      break;
    } else {
      // Se più di 6, prendi 4 per questo gruppo
      groups.push(remaining.slice(0, 4));
      remaining = remaining.slice(4);
    }
  }
  
  return groups;
}

async function generateImage(concerts, outputPath, imageNumber, totalImages) {
  // Dimensioni ottimali per Facebook post (1200x630 per landscape)
  const width = 1200;
  const height = 630;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Carica l'immagine di sfondo per Facebook 
  const backgroundPath = path.join(__dirname, '..', 'img', 'sfondoFB.png');
  console.log('Loading background from:', backgroundPath);
  
  // Verifica che il file esista
  try {
    await fs.access(backgroundPath);
    console.log('Background file exists');
  } catch (error) {
    console.error('Background file not found:', error);
    throw error;
  }
  
  const backgroundImage = await loadImage(backgroundPath);
  
  // Disegna lo sfondo
  ctx.drawImage(backgroundImage, 0, 0, width, height);
  
  // Carica e disegna il logo GOasis in alto
  const logoPath = path.join(__dirname, '..', 'img', 'logo GOasis.jpeg');
  const logoImage = await loadImage(logoPath);
  
  const logoHeight = 80;
  const logoWidth = (logoImage.width / logoImage.height) * logoHeight;
  const logoX = (width - logoWidth) / 2;
  const logoY = 40;
  
  ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
  
  // Calcola posizione della tabella con spaziatura simmetrica
  const tableStartY = logoY + logoHeight + 60; // 60px di margine dal logo
  const bottomMargin = 60; // Stessa distanza dal bordo inferiore
  const availableHeight = height - tableStartY - bottomMargin;
  
  // Disegna la tabella dei concerti
  await drawConcertsTable(ctx, concerts, width, tableStartY, availableHeight, imageNumber, totalImages);
  
  // Salva l'immagine
  console.log('Saving image to:', outputPath);
  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(outputPath, buffer);
  console.log('Image saved successfully:', outputPath);
}

async function drawConcertsTable(ctx, concerts, canvasWidth, startY, availableHeight, imageNumber, totalImages) {
  // Colori del brand
  const primaryColor = '#b22222'; // Rosso mattone
  const textColor = '#ffffff';
  const tableBackgroundColor = 'rgba(0, 0, 0, 0.8)';
  
  // Configurazione tabella
  const padding = 20;
  const rowHeight = availableHeight / (concerts.length + 1); // +1 per header
  const tableWidth = Math.min(800, canvasWidth - 100);
  const tableX = (canvasWidth - tableWidth) / 2;
  
  // Sfondo tabella
  ctx.fillStyle = tableBackgroundColor;
  ctx.fillRect(tableX - padding, startY - padding, tableWidth + padding * 2, availableHeight + padding * 2);
  
  // Border della tabella
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(tableX - padding, startY - padding, tableWidth + padding * 2, availableHeight + padding * 2);
  
  // Font per il testo
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  // Header della tabella
  ctx.font = 'bold 24px Arial';
  const headerY = startY + rowHeight / 2;
  
  ctx.fillStyle = primaryColor;
  ctx.fillRect(tableX, startY, tableWidth, rowHeight);
  
  ctx.fillStyle = textColor;
  ctx.fillText('DATA', tableX + 20, headerY);
  ctx.fillText('LOCALE', tableX + 150, headerY);
  ctx.fillText('LUOGO', tableX + 450, headerY);
  
  // Righe dei concerti
  ctx.font = '20px Arial';
  concerts.forEach((concert, index) => {
    const y = startY + (index + 1) * rowHeight;
    const rowY = y + rowHeight / 2;
    
    // Sfondo alternato per le righe
    if (index % 2 === 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(tableX, y, tableWidth, rowHeight);
    }
    
    ctx.fillStyle = textColor;
    
    // Data
    const dateText = `${concert.day}/${concert.month}`;
    ctx.fillText(dateText, tableX + 20, rowY);
    
    // Venue con indicatore acustico
    const venueText = concert.venue + (concert.acoustic ? ' (acustico)' : '');
    ctx.fillText(venueText, tableX + 150, rowY);
    
    // Location
    ctx.fillText(concert.location, tableX + 450, rowY);
  });
  
  // Footer con indicatore pagina se ci sono più immagini
  if (totalImages > 1) {
    ctx.font = '16px Arial';
    ctx.fillStyle = primaryColor;
    ctx.textAlign = 'center';
    const footerY = startY + availableHeight + 40;
    ctx.fillText(`${imageNumber} di ${totalImages}`, canvasWidth / 2, footerY);
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  generateFacebookPosts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { generateFacebookPosts };
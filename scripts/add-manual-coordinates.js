const fs = require('fs').promises;
const path = require('path');

/**
 * Script di utilità per aggiungere coordinate manuali per locali difficili da geocodificare
 * 
 * Usage: node scripts/add-manual-coordinates.js "Nome Locale" lat lng "Descrizione"
 * Esempio: node scripts/add-manual-coordinates.js "Bisboccia" 45.8162 13.3549 "Locale storico di Cervignano"
 */

async function addManualCoordinates(venueName, lat, lng, description = '') {
  try {
    const manualFilePath = path.join(__dirname, '..', 'data', 'manual-coordinates.json');
    
    // Carica file esistente o crea struttura base
    let manualData;
    try {
      const existing = await fs.readFile(manualFilePath, 'utf8');
      manualData = JSON.parse(existing);
    } catch (error) {
      manualData = {
        manual_venues: {
          comment: "Coordinate manuali per locali difficili da geocodificare automaticamente",
          venues: {}
        },
        venue_aliases: {
          comment: "Alias per nomi locali che potrebbero avere grafie diverse",
          aliases: {}
        }
      };
    }
    
    // Aggiungi nuove coordinate
    const key = venueName.toLowerCase();
    manualData.manual_venues.venues[key] = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      display_name: `${venueName}, Friuli-Venezia Giulia, Italia`,
      notes: description || 'Coordinate inserite manualmente',
      added_date: new Date().toISOString().split('T')[0]
    };
    
    // Salva file aggiornato
    await fs.writeFile(manualFilePath, JSON.stringify(manualData, null, 2));
    
    console.log(`✓ Added manual coordinates for: ${venueName}`);
    console.log(`  Coordinates: ${lat}, ${lng}`);
    console.log(`  Description: ${description}`);
    console.log(`  Key: ${key}`);
    
    return true;
  } catch (error) {
    console.error('Error adding manual coordinates:', error);
    return false;
  }
}

// Funzione per cercare coordinate di un locale su Google Maps (manuale)
function showGoogleMapsInstructions(venueName, location = '') {
  const searchQuery = [venueName, location, 'Friuli-Venezia Giulia'].filter(Boolean).join(' ');
  const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
  
  console.log('\n📍 ISTRUZIONI PER TROVARE COORDINATE MANUALMENTE:');
  console.log(`1. Vai su: ${googleMapsUrl}`);
  console.log('2. Clicca sul pin del locale nella mappa');
  console.log('3. Nelle informazioni del locale, clicca sulle coordinate (es: 45.8162, 13.3549)');
  console.log('4. Le coordinate verranno copiate negli appunti');
  console.log('5. Esegui: node scripts/add-manual-coordinates.js "' + venueName + '" LAT LNG "Descrizione"');
  console.log('\nEsempio finale:');
  console.log(`node scripts/add-manual-coordinates.js "${venueName}" 45.8162 13.3549 "Locale trovato manualmente"`);
}

// Esecuzione da command line
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📍 SCRIPT COORDINATE MANUALI');
    console.log('\nComandi disponibili:');
    console.log('  add [nome] [lat] [lng] [descrizione]  - Aggiungi coordinate manuali');
    console.log('  search [nome] [luogo]                 - Mostra istruzioni Google Maps');
    console.log('\nEsempi:');
    console.log('  node scripts/add-manual-coordinates.js add "Bisboccia" 45.8162 13.3549 "Locale storico"');
    console.log('  node scripts/add-manual-coordinates.js search "Locale Sconosciuto" "Udine"');
    process.exit(0);
  }
  
  const command = args[0];
  
  if (command === 'add' && args.length >= 4) {
    const [, venueName, lat, lng, description = ''] = args;
    addManualCoordinates(venueName, lat, lng, description)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else if (command === 'search' && args.length >= 2) {
    const [, venueName, location = ''] = args;
    showGoogleMapsInstructions(venueName, location);
    process.exit(0);
  } else {
    console.error('❌ Parametri non validi. Usa senza parametri per vedere l\'aiuto.');
    process.exit(1);
  }
}

module.exports = { addManualCoordinates, showGoogleMapsInstructions };
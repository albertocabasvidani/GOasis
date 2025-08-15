const { Client } = require('@notionhq/client');
const fs = require('fs').promises;
const path = require('path');

// Inizializza il client Notion
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const databaseId = process.env.NOTION_DATABASE_ID;

// Delay function per evitare rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Funzione per geocoding usando Nominatim (OpenStreetMap)
async function geocodeVenue(venue, location, city) {
  try {
    // Costruisci query di ricerca
    const searchTerms = [venue, location, city].filter(Boolean);
    const query = searchTerms.join(', ') + ', Italia';
    
    console.log(`Geocoding: ${query}`);
    
    // Chiama API Nominatim
    const encodedQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&countrycodes=it`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GOasis-Concert-Map/1.0 (albertocabasvidani@gmail.com)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display_name: result.display_name
      };
    } else {
      console.warn(`No results found for: ${query}`);
      return null;
    }
  } catch (error) {
    console.error(`Geocoding error for ${venue}:`, error);
    return null;
  }
}

async function fetchPastConcertsForMap() {
  try {
    console.log('Fetching past concerts for map from Notion...');
    
    // Query del database Notion - solo concerti passati
    const today = new Date().toISOString().split('T')[0];
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Data',
        date: {
          before: today,
        },
      },
      sorts: [
        {
          property: 'Data',
          direction: 'descending',
        },
      ],
    });

    console.log(`Found ${response.results.length} past concerts`);
    
    // Processa i risultati
    const concerts = response.results.map(page => {
      const properties = page.properties;
      
      return {
        id: page.id,
        data: properties.Data?.date?.start || '',
        ora: properties.Ora?.rich_text?.[0]?.plain_text || '21:00',
        locale: properties.Locale?.title?.[0]?.plain_text || '',
        luogo: properties.Luogo?.rich_text?.[0]?.plain_text || '',
        citta: properties.Città?.rich_text?.[0]?.plain_text || '',
        indirizzo: properties.Indirizzo?.rich_text?.[0]?.plain_text || '',
        note: properties.Note?.rich_text?.[0]?.plain_text || '',
      };
    });

    // Carica dati esistenti se disponibili per evitare geocoding duplicato
    let existingData = {};
    try {
      const existingFile = await fs.readFile(path.join(__dirname, '..', 'data', 'past-concerts-map.json'), 'utf8');
      const existing = JSON.parse(existingFile);
      existing.forEach(concert => {
        if (concert.coordinates) {
          existingData[concert.id] = concert.coordinates;
        }
      });
      console.log(`Loaded ${Object.keys(existingData).length} existing coordinates`);
    } catch (error) {
      console.log('No existing map data found, will geocode all venues');
    }

    // Geocoding per ogni concerto
    const concertsWithCoordinates = [];
    
    for (let i = 0; i < concerts.length; i++) {
      const concert = concerts[i];
      
      // Usa coordinate esistenti se disponibili
      if (existingData[concert.id]) {
        console.log(`Using existing coordinates for ${concert.locale}`);
        concertsWithCoordinates.push({
          ...concert,
          coordinates: existingData[concert.id]
        });
        continue;
      }
      
      // Geocoding per nuovi concerti
      if (concert.locale) {
        const coordinates = await geocodeVenue(concert.locale, concert.luogo, concert.citta);
        
        if (coordinates) {
          concertsWithCoordinates.push({
            ...concert,
            coordinates: coordinates
          });
          console.log(`✓ Geocoded ${concert.locale}: ${coordinates.lat}, ${coordinates.lng}`);
        } else {
          console.log(`✗ Failed to geocode ${concert.locale}`);
          concertsWithCoordinates.push({
            ...concert,
            coordinates: null
          });
        }
        
        // Rate limiting - pausa tra richieste
        await delay(1000);
      }
    }

    // Formatta i concerti per la mappa
    const mapData = concertsWithCoordinates
      .filter(concert => concert.coordinates) // Solo concerti con coordinate valide
      .map(concert => {
        const date = new Date(concert.data);
        const formattedDate = date.toLocaleDateString('it-IT', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        
        return {
          id: concert.id,
          venue: concert.locale,
          location: concert.luogo,
          city: concert.citta,
          date: formattedDate,
          time: concert.ora,
          coordinates: concert.coordinates,
          popupText: `<strong>${concert.locale}</strong><br>${concert.luogo ? concert.luogo + '<br>' : ''}${formattedDate} - ${concert.ora}`
        };
      });

    // Salva i dati in un file JSON
    const outputPath = path.join(__dirname, '..', 'data', 'past-concerts-map.json');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(mapData, null, 2));
    
    console.log(`Successfully processed ${mapData.length} concerts with coordinates`);
    console.log('Past concerts map data saved to data/past-concerts-map.json');
    
    return mapData;
  } catch (error) {
    console.error('Error fetching past concerts for map:', error);
    throw error;
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  fetchPastConcertsForMap()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { fetchPastConcertsForMap };
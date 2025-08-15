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

// Funzione per geocoding con strategie multiple
async function geocodeVenue(venue, location, city) {
  const strategies = [
    // Strategia 1: Query completa
    () => {
      const searchTerms = [venue, location, city].filter(Boolean);
      return searchTerms.join(', ') + ', Italia';
    },
    
    // Strategia 2: Solo venue e location
    () => {
      const searchTerms = [venue, location].filter(Boolean);
      return searchTerms.join(', ') + ', Friuli-Venezia Giulia, Italia';
    },
    
    // Strategia 3: Solo location (città)
    () => {
      return location ? `${location}, Friuli-Venezia Giulia, Italia` : null;
    },
    
    // Strategia 4: Solo venue generico
    () => {
      return venue ? `${venue}, Friuli-Venezia Giulia, Italia` : null;
    },
    
    // Strategia 5: Ricerca con termini alternativi (bar, pub, ristorante)
    () => {
      if (location) {
        return `bar pub ristorante locale ${venue}, ${location}, Italia`;
      }
      return null;
    }
  ];
  
  for (let i = 0; i < strategies.length; i++) {
    const query = strategies[i]();
    if (!query) continue;
    
    console.log(`Geocoding attempt ${i + 1}/5: ${query}`);
    
    try {
      const result = await geocodeWithNominatim(query);
      if (result) {
        console.log(`✓ Success with strategy ${i + 1}`);
        return result;
      }
    } catch (error) {
      console.log(`✗ Strategy ${i + 1} failed:`, error.message);
    }
    
    // Pausa tra tentativi
    await delay(500);
  }
  
  console.warn(`All geocoding strategies failed for: ${venue} - ${location}`);
  return null;
}

// Funzione base per chiamata Nominatim
async function geocodeWithNominatim(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=3&countrycodes=it&addressdetails=1`;
  
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
    // Preferisci risultati con classe 'amenity' (bar, ristoranti, etc.)
    const bestResult = data.find(r => r.class === 'amenity') || data[0];
    
    return {
      lat: parseFloat(bestResult.lat),
      lng: parseFloat(bestResult.lon),
      display_name: bestResult.display_name,
      type: bestResult.type || 'unknown',
      confidence: data.length > 1 ? 'multiple_results' : 'single_result'
    };
  }
  
  return null;
}

async function fetchPastConcertsForMap() {
  try {
    console.log('Fetching past concerts for map from Notion...');
    
    // Carica coordinate manuali se disponibili
    let manualCoordinates = {};
    let venueAliases = {};
    try {
      const manualData = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'manual-coordinates.json'), 'utf8'));
      manualCoordinates = manualData.manual_venues?.venues || {};
      venueAliases = manualData.venue_aliases?.aliases || {};
      console.log(`Loaded ${Object.keys(manualCoordinates).length} manual coordinates and ${Object.keys(venueAliases).length} venue aliases`);
    } catch (error) {
      console.log('No manual coordinates file found, using geocoding only');
    }
    
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
      
      // 1. Prova coordinate manuali prima di tutto
      const manualKey = concert.locale.toLowerCase();
      if (manualCoordinates[manualKey]) {
        console.log(`Using manual coordinates for ${concert.locale}`);
        concertsWithCoordinates.push({
          ...concert,
          coordinates: manualCoordinates[manualKey]
        });
        continue;
      }
      
      // 2. Usa coordinate esistenti se disponibili
      if (existingData[concert.id]) {
        console.log(`Using existing coordinates for ${concert.locale}`);
        concertsWithCoordinates.push({
          ...concert,
          coordinates: existingData[concert.id]
        });
        continue;
      }
      
      // 3. Geocoding per nuovi concerti con strategie multiple
      if (concert.locale) {
        // Controlla alias per nomi alternativi
        let searchVenue = concert.locale;
        for (const [mainName, aliases] of Object.entries(venueAliases)) {
          if (aliases.includes(concert.locale)) {
            searchVenue = mainName;
            console.log(`Using alias: ${concert.locale} -> ${mainName}`);
            break;
          }
        }
        
        const coordinates = await geocodeVenue(searchVenue, concert.luogo, concert.citta);
        
        if (coordinates) {
          concertsWithCoordinates.push({
            ...concert,
            coordinates: coordinates
          });
          console.log(`✓ Geocoded ${concert.locale}: ${coordinates.lat}, ${coordinates.lng} (${coordinates.confidence})`);
        } else {
          console.log(`✗ Failed to geocode ${concert.locale} - consider adding manual coordinates`);
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
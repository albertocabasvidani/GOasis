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

// Funzione per geocoding con Google Places API
async function geocodeWithGooglePlaces(venue, location, city) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    console.log('Google Places API key not available, skipping...');
    return null;
  }
  
  try {
    // Costruisci query per Google Places - location è più importante del venue
    let query = '';
    
    // Casi speciali per città note sul mare (Veneto)
    const coastalCities = ['Caorle', 'Jesolo', 'Bibione', 'Lignano'];
    if (coastalCities.some(c => location?.includes(c))) {
      // Per città costiere, usa prima la città, poi il locale
      query = `${location}, Veneto, Italia, ${venue}`;
    } else {
      // Per altri casi, metti location prima per priorità geografica
      const searchTerms = [venue, location, city].filter(Boolean);
      query = searchTerms.join(', ') + ', Italia';
    }
    
    const encodedQuery = encodeURIComponent(query);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&key=${apiKey}&region=it&language=it`;
    
    console.log(`Google Places search: ${query}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Preferisci risultati che sono bar, ristoranti, locali notturni
      const venueTypes = ['bar', 'restaurant', 'night_club', 'establishment', 'food', 'point_of_interest'];
      
      // Filtra risultati per verificare che siano nella location corretta
      let bestResult = data.results[0];
      
      // Se abbiamo una location, verifica che il risultato sia nella città giusta
      if (location) {
        const locationMatch = data.results.find(r => 
          r.formatted_address && r.formatted_address.toLowerCase().includes(location.toLowerCase())
        );
        
        if (locationMatch) {
          bestResult = locationMatch;
        } else {
          // Se nessun match esatto, preferisci locali commerciali
          bestResult = data.results.find(r => 
            r.types && r.types.some(type => venueTypes.includes(type))
          ) || data.results[0];
        }
      }
      
      return {
        lat: bestResult.geometry.location.lat,
        lng: bestResult.geometry.location.lng,
        display_name: bestResult.formatted_address,
        type: bestResult.types?.[0] || 'establishment',
        confidence: 'google_places',
        place_id: bestResult.place_id,
        rating: bestResult.rating || null
      };
    } else {
      console.log(`Google Places: ${data.status} - ${data.error_message || 'No results'}`);
      return null;
    }
  } catch (error) {
    console.error('Google Places error:', error.message);
    return null;
  }
}

// Funzione per geocoding con strategie multiple + Google Places
async function geocodeVenue(venue, location, city) {
  // Prova prima Google Places (più accurato per locali commerciali)
  console.log(`Trying Google Places for: ${venue}`);
  const googleResult = await geocodeWithGooglePlaces(venue, location, city);
  if (googleResult) {
    console.log(`✓ Google Places success: ${googleResult.lat}, ${googleResult.lng}`);
    return googleResult;
  }
  
  // Fallback su Nominatim con strategie multiple
  console.log(`Google Places failed, trying Nominatim fallback...`);
  
  // Città fuori dal Friuli che ospitano concerti
  const veneteLocations = ['Caorle', 'Jesolo', 'Bibione', 'Lignano', 'Venezia', 'Padova'];
  const isVeneto = location && veneteLocations.some(c => location.includes(c));
  const region = isVeneto ? 'Veneto' : 'Friuli-Venezia Giulia';
  
  const strategies = [
    // Strategia 1: Location prima per evitare ambiguità geografiche
    () => {
      if (location) {
        return `${location}, ${region}, Italia, ${venue}`;
      }
      return null;
    },
    
    // Strategia 2: Query completa tradizionale
    () => {
      const searchTerms = [venue, location, city].filter(Boolean);
      return searchTerms.join(', ') + ', Italia';
    },
    
    // Strategia 3: Solo venue e location con regione
    () => {
      const searchTerms = [venue, location].filter(Boolean);
      return searchTerms.join(', ') + `, ${region}, Italia`;
    },
    
    // Strategia 4: Ricerca con termini alternativi
    () => {
      if (location) {
        return `bar pub ristorante locale ${venue}, ${location}, ${region}, Italia`;
      }
      return null;
    },
    
    // Strategia 5: Solo location (città) come fallback finale
    () => {
      return location ? `${location}, ${region}, Italia` : null;
    }
  ];
  
  for (let i = 0; i < strategies.length; i++) {
    const query = strategies[i]();
    if (!query) continue;
    
    console.log(`Nominatim attempt ${i + 1}/4: ${query}`);
    
    try {
      const result = await geocodeWithNominatim(query);
      if (result) {
        console.log(`✓ Nominatim success with strategy ${i + 1}`);
        return result;
      }
    } catch (error) {
      console.log(`✗ Nominatim strategy ${i + 1} failed:`, error.message);
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
    
    // Sistema completamente automatico - nessun intervento manuale richiesto
    
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
      
      // 1. Usa coordinate esistenti dalla cache se disponibili (ma verifica accuratezza)
      if (existingData[concert.id]) {
        // Lista di concerti con coordinate sbagliate da ri-geocodificare
        const wrongLocations = [
          'Verde Mare Club', // Era a Pordenone invece di Caorle
          'Live Drink' // Potrebbe essere a Jesolo sbagliata
        ];
        
        // Se il concerto è nella lista di quelli sbagliati, ri-geocodifica
        if (wrongLocations.some(name => concert.locale.includes(name))) {
          console.log(`Re-geocoding ${concert.locale} due to known incorrect location`);
        } else {
          console.log(`Using cached coordinates for ${concert.locale}`);
          concertsWithCoordinates.push({
            ...concert,
            coordinates: existingData[concert.id]
          });
          continue;
        }
      }
      
      // 2. Geocoding automatico con Google Places + Nominatim fallback
      if (concert.locale) {
        console.log(`Auto-geocoding: ${concert.locale} in ${concert.luogo}`);
        
        const coordinates = await geocodeVenue(concert.locale, concert.luogo, concert.citta);
        
        if (coordinates) {
          concertsWithCoordinates.push({
            ...concert,
            coordinates: coordinates
          });
          console.log(`✓ Successfully geocoded ${concert.locale}: ${coordinates.lat}, ${coordinates.lng} (${coordinates.confidence})`);
        } else {
          console.log(`✗ Auto-geocoding failed for ${concert.locale} - but will keep trying different strategies`);
          // Non aggiungiamo concerti senza coordinate - proviamo sempre a trovarle
        }
        
        // Rate limiting - pausa tra richieste
        await delay(1200);
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
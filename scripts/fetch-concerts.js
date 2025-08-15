const { Client } = require('@notionhq/client');
const fs = require('fs').promises;
const path = require('path');

// Inizializza il client Notion
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const databaseId = process.env.NOTION_DATABASE_ID;

async function fetchConcerts() {
  try {
    console.log('Fetching concerts from Notion database with correct permissions...');
    
    // Query del database Notion (senza filtro data per test)
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          property: 'Data',
          direction: 'ascending',
        },
      ],
      page_size: 10,
    });

    console.log(`Found ${response.results.length} results from Notion`);
    
    // Debug: log delle proprietà del primo risultato
    if (response.results.length > 0) {
      console.log('Properties of first result:', Object.keys(response.results[0].properties));
      console.log('First result properties:', JSON.stringify(response.results[0].properties, null, 2));
    }
    
    // Processa i risultati
    const concerts = response.results.map(page => {
      const properties = page.properties;
      console.log(`Processing concert: ${properties.Locale?.title?.[0]?.plain_text || 'No title'}`);
      
      return {
        id: page.id,
        data: properties.Data?.date?.start || '',
        ora: properties.Ora?.rich_text?.[0]?.plain_text || '21:00',
        locale: properties.Locale?.title?.[0]?.plain_text || '',
        citta: properties.Città?.rich_text?.[0]?.plain_text || '',
        indirizzo: properties.Indirizzo?.rich_text?.[0]?.plain_text || '',
        note: properties.Note?.rich_text?.[0]?.plain_text || '',
      };
    });

    // Formatta i concerti per il frontend
    const formattedConcerts = concerts.map(concert => {
      const date = new Date(concert.data);
      const day = date.getDate();
      const month = date.toLocaleString('it-IT', { month: 'short' }).toUpperCase();
      const year = date.getFullYear();
      
      return {
        day: day,
        month: month,
        year: year,
        fullDate: concert.data,
        time: concert.ora,
        venue: concert.locale,
        city: concert.citta,
        address: concert.indirizzo,
        notes: concert.note,
      };
    });

    // Salva i dati in un file JSON
    const outputPath = path.join(__dirname, '..', 'data', 'concerts.json');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(formattedConcerts, null, 2));
    
    console.log(`Successfully fetched ${concerts.length} concerts`);
    console.log('Concerts saved to data/concerts.json');
    
    return formattedConcerts;
  } catch (error) {
    console.error('Error fetching concerts from Notion:', error);
    throw error;
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  fetchConcerts()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { fetchConcerts };
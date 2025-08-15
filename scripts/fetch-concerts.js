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
    console.log('Fetching upcoming concerts from Notion...');
    
    // Query del database Notion - solo concerti futuri (da oggi in poi)
    const today = new Date().toISOString().split('T')[0];
    console.log(`Today is: ${today}`);
    
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Data',
        date: {
          on_or_after: today,
        },
      },
      sorts: [
        {
          property: 'Data',
          direction: 'ascending',
        },
      ],
    });

    console.log(`Found ${response.results.length} upcoming concerts`);
    
    // Log delle date per debug
    response.results.forEach((page, index) => {
      const dateProperty = page.properties.Data?.date;
      console.log(`Concert ${index + 1}: ${page.properties.Locale?.title?.[0]?.plain_text} - Date: ${JSON.stringify(dateProperty)}`);
    });
    
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
        location: concert.luogo,
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
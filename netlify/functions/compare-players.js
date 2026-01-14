exports.handler = async (event, context) => {
  // Gestione CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Risposta per richieste OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Accetta solo richieste POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Parsing del body della richiesta
    const { player1, player2 } = JSON.parse(event.body);

    // Validazione input
    if (!player1?.name || !player2?.name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Dati giocatori mancanti' })
      };
    }

    // Verifica API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY non configurata');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key non configurata' })
      };
    }

    // Costruzione del prompt
    const prompt = `Sei un esperto di storia del calcio italiano e del Milan. Crea un confronto approfondito e professionale tra questi due giocatori del Milan:

GIOCATORE 1: ${player1.name}${player1.period ? ` (Periodo: ${player1.period})` : ''}${player1.role ? ` (Ruolo: ${player1.role})` : ''}

GIOCATORE 2: ${player2.name}${player2.period ? ` (Periodo: ${player2.period})` : ''}${player2.role ? ` (Ruolo: ${player2.role})` : ''}

Il confronto deve includere:
1. Breve introduzione sui due giocatori
2. Statistiche e numeri principali (presenze, gol, assist se disponibili)
3. Caratteristiche tecniche e stile di gioco
4. Palmares con il Milan (titoli vinti)
5. Momenti iconici e partite memorabili
6. Impatto sulla storia del club
7. Confronto diretto: punti di forza di ciascuno
8. Conclusione equilibrata

Scrivi in italiano con stile professionale ma accessibile ai tifosi. Usa formattazione HTML con tag <h3> per i titoli delle sezioni, <p> per i paragrafi, <strong> per evidenziare elementi importanti, <ul> e <li> per elenchi puntati quando appropriato. Non usare markdown.

Sii obiettivo, accurato e rispettoso di entrambi i giocatori. Se non hai certezza su alcuni dati, indicalo chiaramente.`;

    console.log('Chiamata API Anthropic in corso...');

    // Chiamata all'API di Anthropic con fetch nativo
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Errore API Anthropic:', response.status, errorData);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Errore chiamata API',
          details: errorData
        })
      };
    }

    const data = await response.json();
    const comparison = data.content[0].text;

    console.log('Confronto generato con successo');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ comparison })
    };

  } catch (error) {
    console.error('Errore nella funzione:', error.message);
    console.error('Stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Errore interno del server',
        message: error.message 
      })
    };
  }
};

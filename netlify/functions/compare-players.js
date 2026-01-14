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

    // Costruzione del prompt - versione più breve per ridurre token
    const prompt = `Sei un esperto di storia del Milan. Confronta brevemente questi due giocatori:

GIOCATORE 1: ${player1.name}${player1.period ? ` (${player1.period})` : ''}${player1.role ? ` - ${player1.role}` : ''}

GIOCATORE 2: ${player2.name}${player2.period ? ` (${player2.period})` : ''}${player2.role ? ` - ${player2.role}` : ''}

Crea un confronto di massimo 600 parole con:
1. Introduzione breve (50 parole)
2. Statistiche chiave 
3. Stili di gioco
4. Titoli principali
5. Momenti memorabili
6. Confronto diretto
7. Conclusione

Usa HTML: <h3> per titoli, <p> per paragrafi, <strong> per enfasi, <ul><li> per liste. Scrivi in italiano, stile professionale ma accessibile.`;

    console.log('Inizio chiamata API Anthropic...');
    console.log('Player 1:', player1.name);
    console.log('Player 2:', player2.name);

    // Chiamata con timeout personalizzato
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 secondi

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000, // Ridotto per velocità
          messages: [{
            role: 'user',
            content: prompt
          }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ 
            error: 'Errore API Anthropic',
            status: response.status,
            details: errorText.substring(0, 200)
          })
        };
      }

      const data = await response.json();
      console.log('API call successful');
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.error('Invalid API response structure:', JSON.stringify(data));
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: 'Risposta API non valida' })
        };
      }

      const comparison = data.content[0].text;
      console.log('Confronto generato, lunghezza:', comparison.length);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ comparison })
      };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Request timeout dopo 25 secondi');
        return {
          statusCode: 504,
          headers,
          body: JSON.stringify({ 
            error: 'Timeout della richiesta',
            message: 'La chiamata API ha impiegato troppo tempo. Riprova.'
          })
        };
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Errore generale:', error.message);
    console.error('Error name:', error.name);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Errore interno',
        message: error.message,
        type: error.name
      })
    };
  }
};

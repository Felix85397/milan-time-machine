exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Metodo non consentito' }) };
  }

  try {
    const { player1, player2 } = JSON.parse(event.body);

    if (!player1?.name || !player2?.name) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Dati giocatori mancanti' }) };
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY non configurata');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key non configurata' }) };
    }

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Errore API Anthropic', status: response.status, details: errorText.substring(0, 200) }) };
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.error('Invalid API response structure:', JSON.stringify(data));
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Risposta API non valida' }) };
      }

      const comparison = data.content[0].text;
      console.log('Confronto generato, lunghezza:', comparison.length);

      return { statusCode: 200, headers, body: JSON.stringify({ comparison }) };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Request timeout dopo 25 secondi');
        return { statusCode: 504, headers, body: JSON.stringify({ error: 'Timeout della richiesta', message: 'La chiamata API ha impiegato troppo tempo. Riprova.' }) };
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Errore generale:', error.message);
    console.error('Error name:', error.name);
    console.error('Stack:', error.stack);
    
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Errore interno', message: error.message, type: error.name }) };
  }
};

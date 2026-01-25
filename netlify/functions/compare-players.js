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

    const prompt = `Sei un esperto di storia del calcio e del Milan. Crea un confronto CONCISO (massimo 500 parole) tra:

GIOCATORE 1: ${player1.name}${player1.period ? ` (${player1.period})` : ''}${player1.role ? ` - ${player1.role}` : ''}

GIOCATORE 2: ${player2.name}${player2.period ? ` (${player2.period})` : ''}${player2.role ? ` - ${player2.role}` : ''}

REGOLE FONDAMENTALI:
- Massimo 500 parole totali
- Per statistiche usa "circa", "oltre" se non sei sicuro al 100%
- Focus su analisi qualitativa (stile, impatto) più che numeri
- Solo palmares certo e verificabile

Include queste sezioni:
1. Introduzione (2-3 righe)
2. Statistiche approssimative chiave
3. Stile di gioco e caratteristiche (SEZIONE PRINCIPALE)
4. Titoli vinti (solo certi)
5. Impatto sul Milan
6. Confronto diretto
7. Conclusione breve

Formattazione HTML: <h3> per titoli, <p> per testo, <strong> per enfasi, <ul><li> per liste brevi.
Scrivi in italiano, stile professionale ma accessibile. Risposta RAPIDA e CONCISA.`;

    console.log('Chiamata API in corso...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 24000); // 24 secondi (sotto il limite Netlify)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Errore API' }) };
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Risposta non valida' }) };
      }

      let comparison = data.content[0].text;
      
      // Disclaimer automatico
      const disclaimer = `<div style="margin-top: 25px; padding: 12px; background: #fff3cd; border-left: 4px solid #c8102e; border-radius: 6px;">
<p style="margin: 0; font-size: 0.85em; color: #856404;"><strong>📊 Nota:</strong> Le statistiche sono approssimative. Per dati ufficiali consulta Transfermarkt o fonti specializzate.</p>
</div>`;
      
      comparison += disclaimer;

      return { statusCode: 200, headers, body: JSON.stringify({ comparison }) };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Timeout dopo 24 secondi');
        return { statusCode: 504, headers, body: JSON.stringify({ error: 'Timeout' }) };
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Errore:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Errore interno' }) };
  }
};

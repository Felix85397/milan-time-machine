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

REGOLE FONDAMENTALI PER L'ACCURATEZZA:
- Consulta mentalmente fonti affidabili come Transfermarkt, Wikipedia e archivi ufficiali
- Se non sei ASSOLUTAMENTE CERTO di una statistica, usa termini approssimativi: "circa", "oltre", "più di"
- NON inventare mai numeri precisi: è meglio dire "dati non disponibili con certezza" che dare cifre sbagliate
- Per il palmares, elenca SOLO i titoli di cui sei completamente sicuro
- Dai priorità all'analisi qualitativa (stile di gioco, impatto) rispetto alle statistiche nude

Il confronto deve includere:
1. Breve introduzione sui due giocatori
2. Statistiche principali (usa approssimazioni se necessario: "circa 500 presenze", "oltre 50 gol")
3. Caratteristiche tecniche e stile di gioco (ENFASI PRINCIPALE)
4. Palmares con il Milan (solo titoli certi)
5. Momenti iconici e partite memorabili
6. Impatto sulla storia del club
7. Confronto diretto: punti di forza di ciascuno
8. Conclusione equilibrata

Scrivi in italiano con stile professionale ma accessibile ai tifosi. Usa formattazione HTML con tag <h3> per i titoli delle sezioni, <p> per i paragrafi, <strong> per evidenziare elementi importanti, <ul> e <li> per elenchi puntati quando appropriato. Non usare markdown.

Sii obiettivo, accurato e rispettoso di entrambi i giocatori. MASSIMA ATTENZIONE ALL'ACCURATEZZA: meglio approssimare che sbagliare.`;

    console.log('Chiamata API Anthropic in corso...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

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
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Errore API Anthropic' }) };
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.error('Invalid API response structure');
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Risposta API non valida' }) };
      }

      let comparison = data.content[0].text;
      
      // Aggiungi disclaimer automatico
      const disclaimer = `<div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-left: 4px solid #c8102e; border-radius: 8px;">
<p style="margin: 0; font-size: 0.9em; color: #856404;"><strong>📊 Nota sulle statistiche:</strong> I dati numerici riportati sono approssimativi e potrebbero non essere completamente aggiornati. Per statistiche ufficiali precise, si consiglia di consultare fonti specializzate come Transfermarkt, Wikipedia o il sito ufficiale dell'AC Milan.</p>
</div>`;
      
      comparison += disclaimer;
      
      console.log('Confronto generato con successo');

      return { statusCode: 200, headers, body: JSON.stringify({ comparison }) };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Request timeout dopo 45 secondi');
        return { statusCode: 504, headers, body: JSON.stringify({ error: 'Timeout della richiesta' }) };
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Errore generale:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Errore interno', message: error.message }) };
  }
};

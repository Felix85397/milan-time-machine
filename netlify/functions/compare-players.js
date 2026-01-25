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

    const prompt = `Sei un esperto di storia del Milan. Confronta questi giocatori in modo CONCISO (400-500 parole):

${player1.name}${player1.period ? ` (${player1.period})` : ''} vs ${player2.name}${player2.period ? ` (${player2.period})` : ''}

REGOLE CRITICHE - ACCURATEZZA:
- Consulta mentalmente Transfermarkt e Wikipedia prima di dare numeri
- USA SEMPRE approssimazioni: "circa 580 presenze", "oltre 50 gol", "più di 100 assist"
- MAI numeri precisi a meno che tu non sia sicuro al 100%
- Per palmares: elenca SOLO titoli di cui sei assolutamente certo
- Se un dato non è certo: scrivi "dato non disponibile con certezza"

Struttura (400-500 parole totali):
1. Intro breve (2 righe)
2. Statistiche approssimative (usa "circa", "oltre")
3. Stile di gioco (PRINCIPALE - 40% del testo)
4. Titoli vinti (solo certi)
5. Momenti memorabili
6. Confronto punti di forza
7. Conclusione (2-3 righe)

HTML: <h3> titoli, <p> testo, <strong> enfasi, <ul><li> liste brevi.
Italiano professionale ma chiaro. VELOCE E CONCISO.`;

    console.log('API call starting...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 23000); // 23 secondi di sicurezza

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
          max_tokens: 1800,
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
      
      if (!data.content?.[0]?.text) {
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Risposta non valida' }) };
      }

      let comparison = data.content[0].text;
      
      const disclaimer = `<div style="margin-top: 25px; padding: 12px; background: #fff3cd; border-left: 4px solid #c8102e; border-radius: 6px;">
<p style="margin: 0; font-size: 0.85em; color: #856404;"><strong>📊 Nota:</strong> Le statistiche riportate sono approssimative. Per dati ufficiali precisi consulta <a href="https://www.transfermarkt.it" target="_blank" style="color: #c8102e;">Transfermarkt</a> o fonti specializzate.</p>
</div>`;
      
      comparison += disclaimer;

      return { statusCode: 200, headers, body: JSON.stringify({ comparison }) };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return { statusCode: 504, headers, body: JSON.stringify({ error: 'Timeout' }) };
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('Error:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Errore interno' }) };
  }
};

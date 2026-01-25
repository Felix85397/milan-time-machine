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
    const { milanTeam, opponentTeam, opponentInfo } = JSON.parse(event.body);

    if (!milanTeam || !opponentTeam) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Dati squadre mancanti' }) };
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY non configurata');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key non configurata' }) };
    }

    const prompt = `Sei un esperto di storia del calcio e del Milan. Analizza uno scontro ipotetico tra queste due squadre:

SQUADRA 1: ${milanTeam}
SQUADRA 2: ${opponentTeam}
${opponentInfo ? `Info aggiuntive su ${opponentTeam}: ${opponentInfo}` : ''}

Crea un'analisi approfondita di massimo 700 parole che includa:

1. **Introduzione**: Breve presentazione delle due squadre e del contesto storico
2. **${milanTeam} - Rosa e tattica**: Formazione tipo, giocatori chiave, modulo, stile di gioco
3. **${opponentTeam} - Rosa e tattica**: Formazione tipo, giocatori chiave, modulo, stile di gioco  
4. **Palmares**: Titoli vinti da ciascuna squadra nella stagione indicata o nel periodo di riferimento
5. **Analisi tattica dello scontro**: Come le due squadre si affronterebbero, punti di forza e debolezza
6. **Momenti chiave**: Possibili situazioni decisive della partita
7. **Pronostico**: Risultato più probabile con motivazione tattica e tecnica
8. **Conclusione**: Riflessione equilibrata sullo scontro

Usa HTML per la formattazione:
- <h3> per i titoli delle sezioni
- <p> per i paragrafi
- <strong> per evidenziare elementi importanti
- <ul> e <li> per liste quando appropriato

Scrivi in italiano con stile professionale ma accessibile. Sii obiettivo e rispettoso di entrambe le squadre. Basa l'analisi su dati storici reali quando disponibili.`;

    console.log('Analizzando scontro tra squadre...');

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
          max_tokens: 2500,
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
      const battle = data.content[0].text;

      return { statusCode: 200, headers, body: JSON.stringify({ battle }) };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return { statusCode: 504, headers, body: JSON.stringify({ error: 'Timeout' }) };
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Errore:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Errore interno', message: error.message }) };
  }
};

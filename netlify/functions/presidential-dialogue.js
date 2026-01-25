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
    const { president1, president2, topic, history, isContinuation } = JSON.parse(event.body);

    if (!president1 || !president2 || !topic) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Dati mancanti' }) };
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY non configurata');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key non configurata' }) };
    }

    const prompt = isContinuation ? 
      `Continua questo dialogo tra ${president1} e ${president2} sul tema: "${topic}".

DIALOGO PRECEDENTE:
${history}

Genera ESATTAMENTE 6 nuove battute (3 per ciascun presidente), alternando i presidenti. Ogni battuta deve essere coerente con la personalità storica, lo stile comunicativo e le idee del presidente che parla.

Formatta usando HTML:
<div class="dialogue-turn">
<div class="president-name">${president1}:</div>
<p>[battuta]</p>
</div>

Mantieni lo stesso tono e argomenti del dialogo precedente, approfondendo ulteriormente.` :
      `Crea un dialogo realistico tra ${president1} e ${president2}, due presidenti storici del Milan, sul tema: "${topic}".

Caratteristiche dei presidenti:
- Alfred Edwards (1908-1909, 1910-1928): Inglese, fondatore, visionario, pioniere del calcio in Italia
- Piero Pirelli (1908-1929): Industriale, pragmatico, investitore lungimirante
- Andrea Rizzoli (1963-1975): Editore, uomo di cultura, costruttore di squadre vincenti
- Franco Carraro (1975-1977): Politico, diplomatico, breve mandato di transizione
- Felice Colombo (1977-1980, 1984-1986): Imprenditore, gestione difficile, periodi di crisi
- Silvio Berlusconi (1986-2017): Visionario, vincente, comunicatore carismatico, ambizione europea
- Gerry Cardinale (2022-presente): Americano, manager moderno, approccio finanziario, sostenibilità

Genera ESATTAMENTE 6 battute (3 per ${president1} e 3 per ${president2}), alternando i presidenti. Ogni battuta deve riflettere:
- La personalità storica del presidente
- Il suo stile comunicativo
- Le sue idee sul calcio e sul Milan
- Il contesto storico della sua presidenza

Formatta usando HTML:
<div class="dialogue-turn">
<div class="president-name">${president1}:</div>
<p>[battuta che riflette la sua personalità e visione]</p>
</div>

<div class="dialogue-turn">
<div class="president-name">${president2}:</div>
<p>[risposta coerente con la sua personalità]</p>
</div>

Continua alternando per 6 battute totali. Usa un linguaggio appropriato all'epoca e alla personalità di ciascuno.`;

    console.log('Generando dialogo presidenziale...');

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
      const dialogue = data.content[0].text;

      return { statusCode: 200, headers, body: JSON.stringify({ dialogue }) };
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

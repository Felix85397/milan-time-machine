export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  try {
    const { president1, president2, topic, history, isContinuation } = req.body;

    if (!president1 || !president2 || !topic) {
      return res.status(400).json({ error: 'Dati mancanti' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'API key non configurata' });
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
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return res.status(502).json({ error: 'Errore API' });
    }

    const data = await response.json();
    const dialogue = data.content[0].text;

    return res.status(200).json({ dialogue });

  } catch (error) {
    console.error('Errore:', error);
    return res.status(500).json({ error: 'Errore interno', message: error.message });
  }
}

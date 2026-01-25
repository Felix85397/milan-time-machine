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
    const { player1, player2 } = req.body;

    if (!player1?.name || !player2?.name) {
      return res.status(400).json({ error: 'Dati giocatori mancanti' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY non configurata');
      return res.status(500).json({ error: 'API key non configurata' });
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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return res.status(502).json({ error: 'Errore API Anthropic' });
    }

    const data = await response.json();
    
    if (!data.content?.[0]?.text) {
      return res.status(502).json({ error: 'Risposta non valida' });
    }

    const comparison = data.content[0].text;
    console.log('Confronto generato con successo');

    return res.status(200).json({ comparison });

  } catch (error) {
    console.error('Errore:', error.message);
    return res.status(500).json({ error: 'Errore interno', message: error.message });
  }
}

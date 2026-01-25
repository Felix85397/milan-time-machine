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
    const { milanTeam, opponentTeam, opponentInfo } = req.body;

    if (!milanTeam || !opponentTeam) {
      return res.status(400).json({ error: 'Dati squadre mancanti' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'API key non configurata' });
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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return res.status(502).json({ error: 'Errore API' });
    }

    const data = await response.json();
    const battle = data.content[0].text;

    return res.status(200).json({ battle });

  } catch (error) {
    console.error('Errore:', error);
    return res.status(500).json({ error: 'Errore interno', message: error.message });
  }
}
```

**Commit!**

---

## ✅ Risultato finale

Dopo aver creato i 3 file, il tuo repository GitHub avrà questa struttura:
```
milan-time-machine/
├── api/
│   ├── compare-players.js      ✅
│   ├── presidential-dialogue.js ✅
│   └── team-battle.js          ✅
├── index.html                   ✅ (già aggiornato)
├── netlify/                     (puoi lasciare o eliminare)
├── netlify.toml                 (puoi lasciare o eliminare)
└── package.json                 (puoi lasciare o eliminare)

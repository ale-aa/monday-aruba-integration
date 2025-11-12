const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../utils/jwtUtils');

router.post('/fields/email-options', async (req, res) => {
  try {
    console.log('📋 CUSTOM FIELD: email-options called');
    console.log('[CustomField] Request body:', JSON.stringify(req.body, null, 2));

    // Verifica JWT
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const signingSecret = process.env.SIGNING_SECRET || process.env.MONDAY_SIGNING_SECRET;
    const jwtPayload = verifyJWT(token, signingSecret);
    const shortLivedToken = jwtPayload.shortLivedToken;

    // Estrai boardId dalla dependency
    const payload = req.body.payload || req.body;
    const boardId = payload.board_id ||
                    payload.boardId ||
                    payload.dependencies?.board_id;

    console.log('[CustomField] Full payload:', JSON.stringify(payload, null, 2));
    console.log('[CustomField] boardId from dependency:', boardId);

    // Se abbiamo boardId e shortLivedToken, leggi le email dalla board
    if (boardId && shortLivedToken) {

      // OPZIONE A: Leggi tutte le email dalla board
      const query = `
        query ($boardId: [Int!]!) {
          boards (ids: $boardId) {
            items_page {
              items {
                id
                name
                column_values (ids: ["${columnId || 'email'}"]) {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;

      const apiResponse = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': shortLivedToken
        },
        body: JSON.stringify({
          query,
          variables: { boardId: [Number(boardId)] }
        })
      });

      const apiData = await apiResponse.json();
      console.log('[CustomField] API response:', JSON.stringify(apiData, null, 2));

      // Estrai email dalle righe
      const items = apiData.data?.boards?.[0]?.items_page?.items || [];
      const options = items
        .map(item => {
          const emailCol = item.column_values?.[0];
          let email = emailCol?.text;

          // Prova parsing JSON se text è vuoto
          if (!email && emailCol?.value) {
            try {
              const parsed = JSON.parse(emailCol.value);
              email = parsed.email || parsed.text;
            } catch (e) {}
          }

          if (email && email.includes('@')) {
            return {
              title: `${item.name} (${email})`,
              value: email
            };
          }
          return null;
        })
        .filter(Boolean);

      console.log('[CustomField] Found emails:', options);

      // Ritorna opzioni
      return res.json({
        options: options.length > 0 ? options : [
          { title: 'Nessuna email trovata nella colonna', value: '' }
        ]
      });
    }

    // Fallback: nessun boardId disponibile
    console.warn('[CustomField] No boardId found!');
    return res.json({
      options: [
        { title: 'Board ID mancante - configura dependency', value: '' }
      ]
    });

  } catch (error) {
    console.error('[CustomField] Error:', error);
    return res.json({
      options: [
        { title: 'Errore caricamento email', value: '' }
      ]
    });
  }
});

module.exports = router;

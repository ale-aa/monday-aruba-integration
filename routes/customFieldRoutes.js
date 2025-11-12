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

      // Query per leggere colonne e items
      const query = `
        query ($boardId: [Int!]!) {
          boards (ids: $boardId) {
            columns {
              id
              title
              type
            }
            items_page (limit: 100) {
              items {
                id
                name
                column_values {
                  id
                  type
                  text
                  value
                }
              }
            }
          }
        }
      `;

      console.log('[CustomField] Calling Monday API...');

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

      if (apiData.errors) {
        console.error('[CustomField] API errors:', apiData.errors);
        return res.json({
          options: [
            { title: 'Errore API Monday', value: '' }
          ]
        });
      }

      const board = apiData.data?.boards?.[0];
      if (!board) {
        return res.json({
          options: [
            { title: 'Board non trovata', value: '' }
          ]
        });
      }

      // Trova la prima colonna email
      const emailColumns = board.columns.filter(col => col.type === 'email');
      console.log('[CustomField] Email columns found:', emailColumns.length);

      if (emailColumns.length === 0) {
        return res.json({
          options: [
            { title: 'Nessuna colonna email sulla board', value: '' }
          ]
        });
      }

      const emailColumnId = emailColumns[0].id;
      console.log('[CustomField] Using email column:', emailColumnId, emailColumns[0].title);

      // Estrai email da tutti gli items
      const items = board.items_page?.items || [];
      const options = [];

      for (const item of items) {
        const emailCol = item.column_values.find(cv => cv.id === emailColumnId);

        if (emailCol) {
          let email = emailCol.text;

          // Se text è vuoto, prova value (JSON)
          if (!email && emailCol.value && emailCol.value !== '""' && emailCol.value !== 'null') {
            try {
              const parsed = JSON.parse(emailCol.value);
              email = parsed.email || parsed.text;
            } catch (e) {
              console.error('[CustomField] Parse error:', e);
            }
          }

          if (email && email.includes('@')) {
            options.push({
              title: `${item.name} (${email})`,
              value: email
            });
          }
        }
      }

      console.log('[CustomField] Found', options.length, 'email options');

      if (options.length === 0) {
        return res.json({
          options: [
            { title: 'Nessuna email trovata negli items', value: '' }
          ]
        });
      }

      return res.json({ options });
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

const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../utils/jwtUtils');

/**
 * Custom Field Endpoint: /fields/email-options
 *
 * Monday.com calls this endpoint when loading options for a dynamic dropdown field.
 *
 * Expected behavior:
 * 1. Receive JWT from Monday.com
 * 2. Return array of email options extracted from board items
 *
 * Important: Monday.com custom field endpoints operate in a limited context.
 * They provide a JWT token but may NOT include shortLivedToken for GraphQL API access.
 *
 * For this to work, we need to either:
 * A) Use a pre-stored API token (stored in env)
 * B) Cache the board data separately
 * C) Accept that we can't make API calls in this context
 */
router.post('/fields/email-options', async (req, res) => {
  try {
    console.log('📋 CUSTOM FIELD: email-options called');
    console.log('[CustomField] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[CustomField] Request headers:', Object.keys(req.headers));

    // Estrai token dall'header
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      console.error('[CustomField] No token in Authorization header');
      return res.json({
        options: [
          { title: 'Token non fornito', value: '' }
        ]
      });
    }

    // Verifica JWT
    const signingSecret = process.env.SIGNING_SECRET || process.env.MONDAY_SIGNING_SECRET;
    console.log('[CustomField] Attempting JWT verification...');
    const jwtPayload = verifyJWT(token, signingSecret);

    // Log del payload completo per debugging
    console.log('[CustomField] JWT payload keys:', Object.keys(jwtPayload));
    console.log('[CustomField] Full JWT payload:', JSON.stringify(jwtPayload, null, 2));

    // Estrai il shortLivedToken se disponibile
    const shortLivedToken = jwtPayload.shortLivedToken;
    console.log('[CustomField] shortLivedToken available:', !!shortLivedToken);

    // IMPORTANTE: Verifica se Monday ha fornito un shortLivedToken
    // Se non c'è, non possiamo fare chiamate API a Monday.com da questo contesto
    if (!shortLivedToken) {
      console.warn('[CustomField] ⚠ shortLivedToken NOT PROVIDED by Monday.com');
      console.warn('[CustomField] This might be expected for custom field endpoints');

      // Try using the Monday API token from environment if available
      const apiToken = process.env.MONDAY_API_TOKEN;
      if (!apiToken) {
        console.error('[CustomField] MONDAY_API_TOKEN not configured in environment');
        return res.json({
          options: [
            { title: 'Configurazione mancante: MONDAY_API_TOKEN', value: '' }
          ]
        });
      }

      // Use the API token for GraphQL calls
      console.log('[CustomField] Using MONDAY_API_TOKEN from environment');
    }

    // Estrai boardId dalla dependency
    const payload = req.body.payload || req.body;
    const boardId = payload.board_id ||
                    payload.boardId ||
                    payload.dependencies?.board_id;

    console.log('[CustomField] Extracted boardId:', boardId);
    console.log('[CustomField] Full payload structure:', JSON.stringify(payload, null, 2));

    // Determina quale token usare per l'API
    const apiTokenToUse = shortLivedToken || process.env.MONDAY_API_TOKEN;

    if (!apiTokenToUse) {
      console.error('[CustomField] No valid API token available');
      return res.json({
        options: [
          { title: 'Errore: Token API non disponibile', value: '' }
        ]
      });
    }

    // Se non abbiamo un boardId, non possiamo procedere
    if (!boardId) {
      console.warn('[CustomField] No boardId found in payload');
      return res.json({
        options: [
          { title: 'Board ID mancante - configura la dependency', value: '' }
        ]
      });
    }

    // Test semplice: fai una query di test prima di quella complessa
    console.log('[CustomField] Testing API access with simple query...');
    const testQuery = `
      query {
        me {
          id
          name
          email
        }
      }
    `;

    const testResponse = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiTokenToUse
      },
      body: JSON.stringify({ query: testQuery })
    });

    const testData = await testResponse.json();
    console.log('[CustomField] Test query response:', JSON.stringify(testData, null, 2));

    // Se il test fallisce, non continuare
    if (testData.errors) {
      const errorMsg = testData.errors[0]?.message || 'Unknown error';
      console.error('[CustomField] API test failed:', errorMsg);

      // Se è un errore di autorizzazione, potrebbe significare che il token è scaduto
      // o non ha i permessi giusti
      if (errorMsg.includes('UNAUTHORIZED') || errorMsg.includes('Unauthorized')) {
        return res.json({
          options: [
            { title: `Errore di autorizzazione: ${errorMsg}`, value: '' }
          ]
        });
      }

      return res.json({
        options: [
          { title: `Errore API: ${errorMsg}`, value: '' }
        ]
      });
    }

    // Query per recuperare le email dalla board
    console.log('[CustomField] Fetching board data for ID:', boardId);
    const query = `
      query ($boardId: [ID!]!) {
        boards (ids: $boardId) {
          name
          columns {
            id
            title
            type
          }
          items_page (limit: 500) {
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

    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiTokenToUse
      },
      body: JSON.stringify({
        query,
        variables: { boardId: [boardId.toString()] }
      })
    });

    const data = await response.json();

    // Gestisci errori API
    if (data.errors) {
      console.error('[CustomField] API returned errors:', JSON.stringify(data.errors, null, 2));
      const firstError = data.errors[0]?.message || 'Unknown error';
      return res.json({
        options: [
          { title: `Errore API Monday: ${firstError}`, value: '' }
        ]
      });
    }

    // Estrai i dati della board
    const board = data.data?.boards?.[0];
    if (!board) {
      console.warn('[CustomField] Board not found');
      return res.json({
        options: [
          { title: 'Board non trovata', value: '' }
        ]
      });
    }

    console.log('[CustomField] Board name:', board.name);
    console.log('[CustomField] Total columns:', board.columns.length);

    // Trova le colonne di tipo email
    const emailColumns = board.columns.filter(col => col.type === 'email');
    console.log('[CustomField] Email columns found:', emailColumns.length);

    if (emailColumns.length === 0) {
      console.warn('[CustomField] No email columns on board');
      return res.json({
        options: [
          { title: 'Nessuna colonna email sulla board', value: '' }
        ]
      });
    }

    // Usa la prima colonna email
    const emailColumn = emailColumns[0];
    console.log('[CustomField] Using email column:', emailColumn.id, '-', emailColumn.title);

    // Estrai le email dagli items
    const items = board.items_page?.items || [];
    console.log('[CustomField] Total items on board:', items.length);

    const options = [];
    for (const item of items) {
      const emailValue = item.column_values.find(cv => cv.id === emailColumn.id);

      if (!emailValue) {
        continue;
      }

      // Cerca l'email nel campo text o value
      let email = emailValue.text;

      // Se text è vuoto, prova a parsare il value JSON
      if (!email && emailValue.value) {
        try {
          const parsed = JSON.parse(emailValue.value);
          email = parsed.email || parsed.text;
        } catch (e) {
          // Ignora errori di parsing
        }
      }

      // Valida che sia un'email
      if (email && typeof email === 'string' && email.includes('@')) {
        options.push({
          title: `${item.name} <${email}>`,
          value: email
        });
        console.log('[CustomField] Added option:', item.name, '<' + email + '>');
      }
    }

    console.log('[CustomField] Total email options extracted:', options.length);

    if (options.length === 0) {
      return res.json({
        options: [
          { title: 'Nessuna email trovata negli item della board', value: '' }
        ]
      });
    }

    // Ritorna le opzioni
    console.log('[CustomField] Returning', options.length, 'email options');
    return res.json({ options });

  } catch (error) {
    console.error('[CustomField] Unhandled error:', error.message);
    console.error('[CustomField] Stack:', error.stack);
    return res.json({
      options: [
        { title: `Errore: ${error.message}`, value: '' }
      ]
    });
  }
});

module.exports = router;

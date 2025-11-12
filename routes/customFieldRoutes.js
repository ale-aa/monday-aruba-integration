const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../utils/jwtUtils');

/**
 * Field Definitions Endpoint: /fields/definitions
 *
 * Monday.com calls this endpoint to get the structure/definition of custom fields.
 * This defines WHAT fields are available and their configuration.
 *
 * Response format: { kind: 'field_definitions', fields: [...] }
 */
router.post('/fields/definitions', async (req, res) => {
  try {
    console.log('📋 FIELD DEFINITIONS called');
    console.log('[FieldDefs] Request body:', JSON.stringify(req.body, null, 2));

    // Verifica JWT
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error('[FieldDefs] No authorization header');
      return res.status(401).json({
        message: 'Authorization required',
        kind: 'error'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const signingSecret = process.env.SIGNING_SECRET || process.env.MONDAY_SIGNING_SECRET;

    console.log('[FieldDefs] Verifying JWT...');
    const jwtPayload = verifyJWT(token, signingSecret);
    console.log('[FieldDefs] JWT verified successfully');

    // Restituisci la DEFINIZIONE dei campi
    // Monday richiede di definire i campi di INPUT (struttura)
    // NON le opzioni dinamiche (quelle vengono dal remote_options_url)
    const fieldDefinitions = {
      kind: 'field_definitions',
      fields: [
        {
          id: 'emailColumnId',
          title: 'Email column',
          description: 'Select the email column from the board',
          type: 'column',
          allowed_column_types: ['email'],
          required: true
        },
        {
          id: 'recipient_email',
          title: 'Email Recipient',
          description: 'Select recipient email from board items',
          type: 'dropdown',
          required: true,
          remote_options_url: 'https://d4df2-service-32281405-f2dd3966.us.monday.app/fields/email-options',
          dependencies: ['emailColumnId']
        }
      ]
    };

    console.log('[FieldDefs] Returning field definitions:', JSON.stringify(fieldDefinitions, null, 2));
    return res.status(200).json(fieldDefinitions);

  } catch (error) {
    console.error('[FieldDefs] Error:', error.message);
    console.error('[FieldDefs] Stack:', error.stack);
    return res.status(400).json({
      message: 'Cannot load field definitions',
      kind: 'error',
      details: error.message
    });
  }
});

/**
 * Remote Options Endpoint: /fields/email-options
 *
 * Monday.com calls this endpoint to load OPTIONS for the dropdown field.
 * This provides the ACTUAL VALUES to display in the dropdown.
 *
 * Response format: { kind: 'options', options: [{value, title}, ...] }
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
        kind: 'options',
        options: [
          { value: '', title: 'Token non fornito' }
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
          kind: 'options',
          options: [
            { value: '', title: 'Configurazione mancante: MONDAY_API_TOKEN' }
          ]
        });
      }

      // Use the API token for GraphQL calls
      console.log('[CustomField] Using MONDAY_API_TOKEN from environment');
    }

    // Estrai dati dal payload
    const payload = req.body.payload || req.body;
    const boardId = payload.board_id ||
                    payload.boardId ||
                    payload.dependencies?.board_id;
    const emailColumnId = payload.emailColumnId ||
                          payload.dependencies?.emailColumnId;

    console.log('[CustomField] Extracted boardId:', boardId);
    console.log('[CustomField] Extracted emailColumnId:', emailColumnId);
    console.log('[CustomField] Full payload structure:', JSON.stringify(payload, null, 2));

    // Determina quale token usare per l'API
    const apiTokenToUse = shortLivedToken || process.env.MONDAY_API_TOKEN;

    if (!apiTokenToUse) {
      console.error('[CustomField] No valid API token available');
      return res.json({
        kind: 'options',
        options: [
          { value: '', title: 'Errore: Token API non disponibile' }
        ]
      });
    }

    // Se non abbiamo un boardId, non possiamo procedere
    if (!boardId) {
      console.warn('[CustomField] No boardId found in payload');
      return res.json({
        kind: 'options',
        options: [
          { value: '', title: 'Board ID mancante - configura la dependency' }
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
          kind: 'options',
          options: [
            { value: '', title: `Errore di autorizzazione: ${errorMsg}` }
          ]
        });
      }

      return res.json({
        kind: 'options',
        options: [
          { value: '', title: `Errore API: ${errorMsg}` }
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
        kind: 'options',
        options: [
          { value: '', title: `Errore API Monday: ${firstError}` }
        ]
      });
    }

    // Estrai i dati della board
    const board = data.data?.boards?.[0];
    if (!board) {
      console.warn('[CustomField] Board not found');
      return res.json({
        kind: 'options',
        options: [
          { value: '', title: 'Board non trovata' }
        ]
      });
    }

    console.log('[CustomField] Board name:', board.name);
    console.log('[CustomField] Total columns:', board.columns.length);

    // Determina quale colonna email usare
    let selectedEmailColumn;

    if (emailColumnId) {
      // Se emailColumnId è fornito dalla dependency, usalo
      selectedEmailColumn = board.columns.find(col => col.id === emailColumnId);
      if (!selectedEmailColumn) {
        console.error('[CustomField] Email column not found:', emailColumnId);
        return res.json({
          kind: 'options',
          options: [
            { value: '', title: `Colonna email ${emailColumnId} non trovata` }
          ]
        });
      }
      console.log('[CustomField] Using provided email column:', selectedEmailColumn.id);
    } else {
      // Altrimenti auto-detect la prima colonna email
      const emailColumns = board.columns.filter(col => col.type === 'email');
      console.log('[CustomField] Email columns found:', emailColumns.length);

      if (emailColumns.length === 0) {
        console.warn('[CustomField] No email columns on board');
        return res.json({
          kind: 'options',
          options: [
            { value: '', title: 'Nessuna colonna email sulla board' }
          ]
        });
      }

      selectedEmailColumn = emailColumns[0];
      console.log('[CustomField] Auto-detected email column:', selectedEmailColumn.id);
    }

    console.log('[CustomField] Using email column:', selectedEmailColumn.id, '-', selectedEmailColumn.title);

    // Estrai le email dagli items
    const items = board.items_page?.items || [];
    console.log('[CustomField] Total items on board:', items.length);

    const options = [];
    for (const item of items) {
      const emailValue = item.column_values.find(cv => cv.id === selectedEmailColumn.id);

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
          value: email,
          title: `${item.name} <${email}>`
        });
        console.log('[CustomField] Added option:', item.name, '<' + email + '>');
      }
    }

    console.log('[CustomField] Total email options extracted:', options.length);

    if (options.length === 0) {
      return res.json({
        kind: 'options',
        options: [
          { value: '', title: 'Nessuna email trovata negli item della board' }
        ]
      });
    }

    // Ritorna le opzioni nel formato corretto per Monday.com
    console.log('[CustomField] Returning', options.length, 'email options');
    return res.json({
      kind: 'options',
      options: options
    });

  } catch (error) {
    console.error('[CustomField] Unhandled error:', error.message);
    console.error('[CustomField] Stack:', error.stack);
    return res.json({
      kind: 'options',
      options: [
        { value: '', title: `Errore: ${error.message}` }
      ]
    });
  }
});

module.exports = router;

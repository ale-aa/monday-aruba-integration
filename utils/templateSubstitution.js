/**
 * Template Substitution Utility
 *
 * Sostituisce i placeholder {{variabile}} con i valori forniti da Monday.com
 * Gestisce automaticamente tutti i tipi di colonne Monday
 */

/**
 * Converte un valore complesso in stringa leggibile
 * Utile per gestire le diverse strutture delle colonne Monday
 *
 * @param {*} value - Il valore da convertire
 * @returns {string} - Rappresentazione stringa del valore
 */
function valueToString(value) {
  if (value === null || value === undefined) {
    return '';
  }

  // Stringa semplice
  if (typeof value === 'string') {
    return value;
  }

  // Numero
  if (typeof value === 'number') {
    return String(value);
  }

  // Boolean
  if (typeof value === 'boolean') {
    return value ? 'Sì' : 'No';
  }

  // Oggetto - prova ad estrarre il valore più sensato
  if (typeof value === 'object') {
    // Colonna "people" o "board-relation" - ha struttura { id, name }
    if (value.name) {
      return value.name;
    }

    // Colonna "status" o "dropdown" - ha struttura { label, index, ... }
    if (value.label) {
      return value.label;
    }

    // Colonna "checkbox" o simili - ha struttura { checked: true/false }
    if ('checked' in value) {
      return value.checked ? 'Sì' : 'No';
    }

    // Campi JSON con "value" o "text"
    if (value.value) {
      return String(value.value);
    }

    if (value.text) {
      return String(value.text);
    }

    // Fallback: converti a JSON string
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '[Oggetto complesso]';
    }
  }

  // Fallback per qualsiasi altro tipo
  return String(value);
}

/**
 * Sostituisce i placeholder in un template string
 *
 * Supporta tre pattern di placeholder:
 * 1. {{variabile}} - Sintassi di template custom
 * 2. {prefix.columnId} - Sintassi flessibile con qualsiasi prefisso
 *    Esempi: {pulse.name}, {board.status}, {user.email}, {pulse.email_mkxja1xz}
 * 3. {columnId} - Placeholder diretto senza prefisso
 *
 * Funzionamento:
 * - Cerca tutti i pattern nel template ({{}} e {prefix.} e {})
 * - Sostituisce con i valori presenti in fieldValues
 * - Usa matching intelligente: cerca il columnId tra le chiavi disponibili
 * - Se una variabile non esiste, lascia il placeholder intatto oppure usa stringaVuota
 *
 * @param {string} template - Template string con placeholder
 * @param {Object} fieldValues - Oggetto con i valori da sostituire (inboundFieldValues)
 * @param {boolean} removeUnknown - Se true, rimuove placeholder sconosciuti; se false, li lascia
 * @returns {string} - Template con placeholder sostituiti
 *
 * @example
 * const template = "Ciao {{name}}, email: {{email}}";
 * const fields = { name: "Mario", email: "[email protected]" };
 * substituteTemplate(template, fields); // "Ciao Mario, email: [email protected]"
 *
 * @example
 * const template = "Ciao {pulse.name}, status: {pulse.status}";
 * const fields = { name: "Mario", status: "Active" };
 * substituteTemplate(template, fields); // "Ciao Mario, status: Active"
 *
 * @example
 * const template = "Ciao {name}, email: {board.email_mkxja1xz}";
 * const fields = { name: "Mario", email_mkxja1xz: "[email protected]" };
 * substituteTemplate(template, fields); // "Ciao Mario, email: [email protected]"
 */
function substituteTemplate(template, fieldValues, removeUnknown = true) {
  // Validazione input
  if (!template) {
    return '';
  }

  if (typeof template !== 'string') {
    template = String(template);
  }

  // Se fieldValues non è un oggetto valido, ritorna il template così com'è
  if (!fieldValues || typeof fieldValues !== 'object') {
    return template;
  }

  let result = template;

  // ===== PATTERN 1: {{variabile}} =====
  // Regex per trovare tutti i placeholder {{variabile}}
  const doubleRegex = /\{\{([^}]+)\}\}/g;

  if (result.includes('{{')) {
    let match;
    while ((match = doubleRegex.exec(template)) !== null) {
      const fullPlaceholder = match[0]; // Es: "{{name}}"
      const variableName = match[1].trim(); // Es: "name"

      const value = findValue(fieldValues, variableName);

      // Se il valore esiste, converti a stringa e sostituisci
      if (value !== undefined && value !== null) {
        const stringValue = valueToString(value);
        result = result.replace(fullPlaceholder, stringValue);
      } else {
        // Se la variabile non esiste
        if (removeUnknown) {
          result = result.replace(fullPlaceholder, '');
        }
        // Altrimenti lascia il placeholder così com'è
      }
    }
  }

  // ===== PATTERN 2: {prefix.columnId} =====
  // Regex per trovare tutti i placeholder {prefix.columnId}
  // Accetta qualsiasi prefisso: {pulse.}, {board.}, {user.}, {group.}, {person.}, ecc.
  const prefixRegex = /\{([a-zA-Z0-9_]+)\.([^}]+)\}/g;

  if (result.includes('{') && !result.includes('{{')) {
    let match;
    const toReplace = [];

    // Prima passa: raccogli tutti i match
    let tempMatch;
    while ((tempMatch = prefixRegex.exec(result)) !== null) {
      toReplace.push({
        full: tempMatch[0],
        prefix: tempMatch[1],
        columnId: tempMatch[2].trim()
      });
    }

    // Seconda passa: sostituisci
    for (const item of toReplace) {
      const { full: fullPlaceholder, columnId } = item;

      const value = findValue(fieldValues, columnId);

      // Se il valore esiste, converti a stringa e sostituisci
      if (value !== undefined && value !== null) {
        const stringValue = valueToString(value);
        result = result.replace(fullPlaceholder, stringValue);
      } else {
        // Se la variabile non esiste
        if (removeUnknown) {
          result = result.replace(fullPlaceholder, '');
        }
        // Altrimenti lascia il placeholder così com'è
      }
    }
  }

  // ===== PATTERN 3: {columnId} =====
  // Regex per trovare placeholder diretti senza prefisso
  // Ma esclude i match già catturati da Pattern 2 (che contengono un punto)
  const directRegex = /\{([a-zA-Z0-9_]+)\}/g;

  if (result.includes('{')) {
    let match;
    const toReplace = [];

    // Prima passa: raccogli tutti i match
    let tempMatch;
    while ((tempMatch = directRegex.exec(result)) !== null) {
      const columnId = tempMatch[1].trim();
      // Esclude i match che contengono un punto (già gestiti da Pattern 2)
      if (!columnId.includes('.')) {
        toReplace.push({
          full: tempMatch[0],
          columnId: columnId
        });
      }
    }

    // Seconda passa: sostituisci
    for (const item of toReplace) {
      const { full: fullPlaceholder, columnId } = item;

      const value = findValue(fieldValues, columnId);

      // Se il valore esiste, converti a stringa e sostituisci
      if (value !== undefined && value !== null) {
        const stringValue = valueToString(value);
        result = result.replace(fullPlaceholder, stringValue);
      } else {
        // Se la variabile non esiste
        if (removeUnknown) {
          result = result.replace(fullPlaceholder, '');
        }
        // Altrimenti lascia il placeholder così com'è
      }
    }
  }

  return result;
}

/**
 * Funzione helper per trovare un valore in fieldValues
 * Usa matching intelligente: cerca il columnId tra le chiavi disponibili
 *
 * @param {Object} fieldValues - Oggetto con i dati
 * @param {string} columnId - ID della colonna da cercare
 * @returns {*} - Il valore trovato o undefined
 */
function findValue(fieldValues, columnId) {
  // Match esatto
  if (fieldValues[columnId] !== undefined) {
    return fieldValues[columnId];
  }

  // Match per suffisso o contiene
  for (const [key, val] of Object.entries(fieldValues)) {
    // La chiave contiene il columnId come suffisso (es: email_mkxja1xz contiene "email")
    if (key.endsWith(columnId) || key.includes(columnId)) {
      return val;
    }
    // Il columnId contiene la chiave (es: email_mkxja1xz e cerchiamo per "email")
    if (columnId.includes(key)) {
      return val;
    }
  }

  // Non trovato
  return undefined;
}

module.exports = {
  substituteTemplate,
  valueToString
};

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
 * Supporta due sintassi:
 * 1. {{variabile}} - Sintassi di template custom
 * 2. {pulse.columnId} - Sintassi di Monday.com per i field dinamici
 *
 * Funzionamento:
 * - Cerca tutti i pattern {{variabile}} e {pulse.columnId} nel template
 * - Sostituisce con i valori presenti in fieldValues
 * - Se una variabile non esiste, lascia il placeholder intatto oppure usa stringaVuota
 * - Gestisce automaticamente diversi tipi di valore
 *
 * @param {string} template - Template string con placeholder
 * @param {Object} fieldValues - Oggetto con i valori da sostituire (inboundFieldValues)
 * @param {boolean} removeUnknown - Se true, rimuove placeholder sconosciuti; se false, li lascia
 * @returns {string} - Template con placeholder sostituiti
 *
 * @example
 * const template = "Ciao {{name}}, la tua email è {{email}}";
 * const fields = { name: "Mario Rossi", email: "[email protected]" };
 * substituteTemplate(template, fields); // "Ciao Mario Rossi, la tua email è [email protected]"
 *
 * @example
 * const template = "Ciao {pulse.name}, la tua email è {pulse.email_mkxja1xz}";
 * const fields = { name: "Mario Rossi", email_mkxja1xz: "[email protected]" };
 * substituteTemplate(template, fields); // "Ciao Mario Rossi, la tua email è [email protected]"
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
  const placeholderRegex = /\{\{([^}]+)\}\}/g;

  if (result.includes('{{')) {
    let match;
    while ((match = placeholderRegex.exec(template)) !== null) {
      const fullPlaceholder = match[0]; // Es: "{{name}}"
      const variableName = match[1].trim(); // Es: "name"

      // Estrai il valore dal fieldValues
      const value = fieldValues[variableName];

      // Se il valore esiste, converti a stringa e sostituisci
      if (value !== undefined && value !== null) {
        const stringValue = valueToString(value);
        result = result.replace(fullPlaceholder, stringValue);
      } else {
        // Se la variabile non esiste
        if (removeUnknown) {
          // Rimuovi il placeholder (sostituisci con stringa vuota)
          result = result.replace(fullPlaceholder, '');
        }
        // Altrimenti lascia il placeholder così com'è
      }
    }
  }

  // ===== PATTERN 2: {pulse.columnId} =====
  // Regex per trovare tutti i placeholder {pulse.columnId}
  // Pattern: {pulse. seguito da qualsiasi carattere (non greedy) seguito da }
  const mondayPlaceholderRegex = /\{pulse\.([^}]+)\}/g;

  if (result.includes('{pulse.')) {
    let match;
    // Crea un nuovo oggetto per tracciare le sostituzioni già fatte
    const toReplace = [];

    // Prima passa: raccogli tutti i match
    const tempTemplate = result;
    let tempMatch;
    while ((tempMatch = mondayPlaceholderRegex.exec(tempTemplate)) !== null) {
      toReplace.push({
        full: tempMatch[0],
        columnId: tempMatch[1].trim()
      });
    }

    // Seconda passa: sostituisci
    for (const item of toReplace) {
      const fullPlaceholder = item.full; // Es: "{pulse.name}"
      const columnId = item.columnId; // Es: "name" oppure "email_mkxja1xz"

      // Estrai il valore dal fieldValues
      // Prova prima il columnId diretto, poi il nome semplificato
      let value = fieldValues[columnId];

      // Se non trova, prova a cercare tra le chiavi disponibili
      if (value === undefined || value === null) {
        // Cerca la chiave che contiene il columnId come parte del nome
        for (const [key, val] of Object.entries(fieldValues)) {
          // Match esatto
          if (key === columnId) {
            value = val;
            break;
          }
          // Match per suffisso (es: email_mkxja1xz contiene "email")
          if (key.includes(columnId) || columnId.includes(key)) {
            value = val;
            break;
          }
        }
      }

      // Se il valore esiste, converti a stringa e sostituisci
      if (value !== undefined && value !== null) {
        const stringValue = valueToString(value);
        result = result.replace(fullPlaceholder, stringValue);
      } else {
        // Se la variabile non esiste
        if (removeUnknown) {
          // Rimuovi il placeholder (sostituisci con stringa vuota)
          result = result.replace(fullPlaceholder, '');
        }
        // Altrimenti lascia il placeholder così com'è
      }
    }
  }

  return result;
}

module.exports = {
  substituteTemplate,
  valueToString
};

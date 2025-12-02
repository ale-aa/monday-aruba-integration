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
 * Sostituisce i placeholder {{variabile}} in un template string
 *
 * Funzionamento:
 * - Cerca tutti i pattern {{variabile}} nel template
 * - Sostituisce con i valori presenti in fieldValues
 * - Se una variabile non esiste, lascia il placeholder intatto oppure usa stringaVuota
 * - Gestisce automaticamente diversi tipi di valore
 *
 * @param {string} template - Template string con placeholder {{variabile}}
 * @param {Object} fieldValues - Oggetto con i valori da sostituire (inboundFieldValues)
 * @param {boolean} removeUnknown - Se true, rimuove placeholder sconosciuti; se false, li lascia
 * @returns {string} - Template con placeholder sostituiti
 *
 * @example
 * const template = "Ciao {{name}}, la tua email è {{email}}";
 * const fields = { name: "Mario Rossi", email: "[email protected]" };
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

  // Se non ci sono placeholder, ritorna il template così com'è
  if (!template.includes('{{')) {
    return template;
  }

  // Se fieldValues non è un oggetto valido, ritorna il template così com'è
  if (!fieldValues || typeof fieldValues !== 'object') {
    return template;
  }

  // Regex per trovare tutti i placeholder {{variabile}}
  // Pattern: {{ seguito da qualsiasi carattere (non greedy) seguito da }}
  const placeholderRegex = /\{\{([^}]+)\}\}/g;

  let result = template;
  let match;

  // Iterazione su tutti i placeholder trovati
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

  return result;
}

module.exports = {
  substituteTemplate,
  valueToString
};

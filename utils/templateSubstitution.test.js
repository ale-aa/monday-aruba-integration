/**
 * Test Suite per Template Substitution
 *
 * Verifica che la sostituzione di template funzioni correttamente
 * con diversi tipi di dati e edge cases
 */

const { substituteTemplate, valueToString } = require('./templateSubstitution');

// Colori per output console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`${colors.green}✓${colors.reset} ${message}`);
  } else {
    testsFailed++;
    console.log(`${colors.red}✗${colors.reset} ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  assert(actual === expected, `${message}\n  Expected: "${expected}"\n  Got: "${actual}"`);
}

console.log(`\n${colors.blue}=== TEMPLATE SUBSTITUTION TEST SUITE ===${colors.reset}\n`);

// ========== TEST 1: Template semplice ==========
console.log(`${colors.yellow}Test 1: Simple template substitution${colors.reset}`);
const result1 = substituteTemplate('Ciao {{name}}', { name: 'Mario Rossi' });
assertEquals(result1, 'Ciao Mario Rossi', 'Should replace single placeholder');

// ========== TEST 2: Template con più variabili ==========
console.log(`\n${colors.yellow}Test 2: Multiple placeholders${colors.reset}`);
const result2 = substituteTemplate(
  'Ciao {{name}}, la tua email è {{email}} e il tuo numero è {{phone}}',
  {
    name: 'Mario Rossi',
    email: '[email protected]',
    phone: '+39 123 456 7890'
  }
);
assertEquals(
  result2,
  'Ciao Mario Rossi, la tua email è [email protected] e il tuo numero è +39 123 456 7890',
  'Should replace multiple placeholders'
);

// ========== TEST 3: Variabile mancante con removeUnknown=true ==========
console.log(`\n${colors.yellow}Test 3: Missing variable (removeUnknown=true)${colors.reset}`);
const result3 = substituteTemplate(
  'Ciao {{name}}, il tuo numero è {{phone}}',
  { name: 'Mario' },
  true
);
assertEquals(
  result3,
  'Ciao Mario, il tuo numero è ',
  'Should remove unknown placeholder'
);

// ========== TEST 4: Variabile mancante con removeUnknown=false ==========
console.log(`\n${colors.yellow}Test 4: Missing variable (removeUnknown=false)${colors.reset}`);
const result4 = substituteTemplate(
  'Ciao {{name}}, il tuo numero è {{phone}}',
  { name: 'Mario' },
  false
);
assertEquals(
  result4,
  'Ciao Mario, il tuo numero è {{phone}}',
  'Should keep unknown placeholder'
);

// ========== TEST 5: Template senza variabili ==========
console.log(`\n${colors.yellow}Test 5: Static template (no placeholders)${colors.reset}`);
const result5 = substituteTemplate('Questo è un testo statico', { name: 'Mario' });
assertEquals(
  result5,
  'Questo è un testo statico',
  'Should return template as-is if no placeholders'
);

// ========== TEST 6: Numero come valore ==========
console.log(`\n${colors.yellow}Test 6: Number value${colors.reset}`);
const result6 = substituteTemplate(
  'Il tuo numero ID è {{id}}',
  { id: 12345 }
);
assertEquals(
  result6,
  'Il tuo numero ID è 12345',
  'Should convert number to string'
);

// ========== TEST 7: Boolean come valore ==========
console.log(`\n${colors.yellow}Test 7: Boolean value${colors.reset}`);
const result7a = substituteTemplate(
  'Confermato: {{is_confirmed}}',
  { is_confirmed: true }
);
assertEquals(
  result7a,
  'Confermato: Sì',
  'Should convert true to Sì'
);

const result7b = substituteTemplate(
  'Confermato: {{is_confirmed}}',
  { is_confirmed: false }
);
assertEquals(
  result7b,
  'Confermato: No',
  'Should convert false to No'
);

// ========== TEST 8: Oggetto con proprietà "name" (tipo People) ==========
console.log(`\n${colors.yellow}Test 8: Object with "name" property (People column)${colors.reset}`);
const result8 = substituteTemplate(
  'Assegnato a {{assigned_to}}',
  { assigned_to: { id: '123', name: 'Mario Rossi' } }
);
assertEquals(
  result8,
  'Assegnato a Mario Rossi',
  'Should extract "name" from object'
);

// ========== TEST 9: Oggetto con proprietà "label" (tipo Status) ==========
console.log(`\n${colors.yellow}Test 9: Object with "label" property (Status column)${colors.reset}`);
const result9 = substituteTemplate(
  'Status: {{status}}',
  { status: { label: 'Confermato', index: 2 } }
);
assertEquals(
  result9,
  'Status: Confermato',
  'Should extract "label" from object'
);

// ========== TEST 10: Null e undefined ==========
console.log(`\n${colors.yellow}Test 10: Null and undefined values${colors.reset}`);
const result10a = substituteTemplate(
  'Nome: {{name}}',
  { name: null },
  true
);
assertEquals(
  result10a,
  'Nome: ',
  'Should handle null value'
);

const result10b = substituteTemplate(
  'Nome: {{name}}',
  { name: undefined },
  true
);
assertEquals(
  result10b,
  'Nome: ',
  'Should handle undefined value'
);

// ========== TEST 11: Spazi intorno al placeholder ==========
console.log(`\n${colors.yellow}Test 11: Spaces in placeholder{{ name }}${colors.reset}`);
const result11 = substituteTemplate(
  'Ciao {{ name }}',
  { name: 'Mario' }
);
assertEquals(
  result11,
  'Ciao Mario',
  'Should handle spaces around variable name'
);

// ========== TEST 12: Placeholder ripetuto ==========
console.log(`\n${colors.yellow}Test 12: Repeated placeholder${colors.reset}`);
const result12 = substituteTemplate(
  '{{name}} {{name}} {{name}}',
  { name: 'Mario' }
);
assertEquals(
  result12,
  'Mario Mario Mario',
  'Should replace all occurrences'
);

// ========== TEST 13: Template vuoto ==========
console.log(`\n${colors.yellow}Test 13: Empty template${colors.reset}`);
const result13 = substituteTemplate('', { name: 'Mario' });
assertEquals(
  result13,
  '',
  'Should handle empty template'
);

// ========== TEST 14: fieldValues null ==========
console.log(`\n${colors.yellow}Test 14: Null fieldValues${colors.reset}`);
const result14 = substituteTemplate('Ciao {{name}}', null);
assertEquals(
  result14,
  'Ciao {{name}}',
  'Should return template as-is if fieldValues is null'
);

// ========== TEST 15: Payload Monday.com realistico ==========
console.log(`\n${colors.yellow}Test 15: Realistic Monday.com payload${colors.reset}`);
const mondayPayload = {
  recipientEmail: '[email protected]',
  name: 'Mario Rossi',
  email: '[email protected]',
  phone: '+39 123 456 7890',
  event_date: '2025-12-15',
  status: { label: 'Confermato', index: 2 }
};

const emailSubject = 'Ciao {{name}}, conferma per {{event_date}}';
const emailBody = `Gentile {{name}},

La tua registrazione è confermata.
Email: {{email}}
Telefono: {{phone}}
Evento: {{event_date}}
Status: {{status}}`;

const resultSubject = substituteTemplate(emailSubject, mondayPayload);
const resultBody = substituteTemplate(emailBody, mondayPayload);

assertEquals(
  resultSubject,
  'Ciao Mario Rossi, conferma per 2025-12-15',
  'Subject should be fully substituted'
);

assert(
  resultBody.includes('Gentile Mario Rossi') &&
  resultBody.includes('Email: [email protected]') &&
  resultBody.includes('Telefono: +39 123 456 7890') &&
  resultBody.includes('Evento: 2025-12-15') &&
  resultBody.includes('Status: Confermato'),
  'Body should have all variables substituted'
);

// ========== TEST 16: valueToString edge cases ==========
console.log(`\n${colors.yellow}Test 16: valueToString function${colors.reset}`);

const valueTests = [
  [null, ''],
  [undefined, ''],
  ['hello', 'hello'],
  [123, '123'],
  [true, 'Sì'],
  [false, 'No'],
  [{ name: 'Mario' }, 'Mario'],
  [{ label: 'Active' }, 'Active'],
  [{ value: 'test' }, 'test'],
  [{ text: 'test' }, 'test']
];

valueTests.forEach(([input, expected]) => {
  const result = valueToString(input);
  const inputStr = JSON.stringify(input) || 'undefined';
  assertEquals(
    result,
    expected,
    `valueToString(${inputStr.substring(0, 20)}) should return "${expected}"`
  );
});

// ========== SUMMARY ==========
console.log(`\n${colors.blue}=== TEST SUMMARY ===${colors.reset}`);
console.log(`Total: ${testsRun}`);
console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
if (testsFailed > 0) {
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
} else {
  console.log(`${colors.green}Failed: 0${colors.reset}`);
}

const allPassed = testsFailed === 0;
console.log(`\n${allPassed ? colors.green + '✓ ALL TESTS PASSED' : colors.red + '✗ SOME TESTS FAILED'}${colors.reset}\n`);

// Exit with appropriate code
process.exit(allPassed ? 0 : 1);

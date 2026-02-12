const gutils = require('gurmukhi-utils');

const testSentence = "ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ";
const translit = gutils.toEnglish(testSentence);
console.log(`Original: ${testSentence}`);
console.log(`Transliterated: ${translit}`);

const test2 = "vaahiguroo";
console.log(`isGurmukhi (Roman): ${gutils.isGurmukhi(test2)}`);
console.log(`isGurmukhi (Native): ${gutils.isGurmukhi(testSentence)}`);

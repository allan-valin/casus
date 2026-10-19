// Prints a site's language codes for the deploy workflows: node tools/site_languages.mjs <casus|asia|world>
import { SITES } from '../src/sites.js';
console.log((SITES[process.argv[2]] ?? SITES.casus).languages.join(' '));

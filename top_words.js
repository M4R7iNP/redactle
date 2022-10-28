import { readFile } from 'node:fs/promises';
const TOP_WORDS = JSON.parse(await readFile('top_words.json', 'utf8'));
export default TOP_WORDS;

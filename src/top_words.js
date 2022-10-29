import { readFile } from 'node:fs/promises';
const TOP_WORDS = JSON.parse(
    await readFile(new URL('../data/top_words.json', import.meta.url), 'utf8')
);
export default TOP_WORDS;

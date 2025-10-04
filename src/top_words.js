import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const TOP_WORDS = JSON.parse(
    await readFile(
        resolve(
            dirname(fileURLToPath(import.meta.url)),
            '../data/top_words.json',
        ),
        'utf8',
    ),
);
export default TOP_WORDS;

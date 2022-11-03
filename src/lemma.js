import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database(
    resolve(dirname(fileURLToPath(import.meta.url)), '../data/ordbank.db')
);

const get_lemmas_stmt = db.prepare(`
    select distinct oppslag
    from fullformsliste
    where lemma_id in (
        select lemma_id
        from fullformsliste
        where oppslag in (?)
    )
`);

const get_lemmas_stmt_all = promisify(
    get_lemmas_stmt.all.bind(get_lemmas_stmt)
);

/**
 * @param {string | string[]} words
 * @returns {Promise<string[]>}
 */
export const getLemmas = async (words) =>
    get_lemmas_stmt_all(words).then(
        /**
         * @param {Array<{ OPPSLAG: string }>} rows
         */
        (rows) => rows.map((row) => row.OPPSLAG)
    );

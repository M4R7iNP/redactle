import { promisify } from 'node:util';
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./ordbank.db');

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
 * @param {string | string[]}
 * @returns {Promise<string[]>}
 */
export const getLemmas = async (words) =>
    get_lemmas_stmt_all(words).then((rows) => rows.map((row) => row.OPPSLAG));

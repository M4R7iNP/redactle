import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { differenceInDays } from 'date-fns';

export const START_DATE = new Date('2022-08-17 18:00:00');

/**
 * @param {Date} date
 * @returns {Promise<string>}
 */
export default async function getWikipediaArticleTitleOfTheDay(
    date = new Date(),
) {
    const titles = JSON.parse(
        await readFile(
            resolve(
                dirname(fileURLToPath(import.meta.url)),
                '../data/articlelist.json',
            ),
            'utf8',
        ),
    );
    return titles[differenceInDays(date, START_DATE) % titles.length];
}

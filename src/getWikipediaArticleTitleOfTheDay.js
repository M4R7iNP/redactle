import { readFile } from 'node:fs/promises';
import { differenceInDays } from 'date-fns';

export const START_DATE = new Date('2022-08-17 18:00:00');

/**
 * @param {Date} date
 * @returns {Promise<string>}
 */
const getWikipediaArticleTitleOfTheDay = async (date = new Date()) => {
    return JSON.parse(
        await readFile(
            new URL('../data/articlelist.json', import.meta.url),
            'utf8'
        )
    )[differenceInDays(date, START_DATE)];
};

export default getWikipediaArticleTitleOfTheDay;

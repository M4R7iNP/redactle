import test from 'ava';
import esmock from 'esmock';
import { addDays } from 'date-fns';

/** @type {import('./getWikipediaArticleTitleOfTheDay.js').default} */
const { START_DATE, default: getWikipediaArticleTitleOfTheDay } = await esmock(
    './getWikipediaArticleTitleOfTheDay.js',
    {
        'node:fs/promises': {
            readFile: async () =>
                '["Mata Hari", "Norges Grunnlov", "Gustav Holst"]',
        },
    },
);

test('getWikipediaArticleTitleOfTheDay()', async (t) => {
    t.is(
        await getWikipediaArticleTitleOfTheDay(addDays(START_DATE, 0)),
        'Mata Hari',
    );
    t.is(
        await getWikipediaArticleTitleOfTheDay(addDays(START_DATE, 1)),
        'Norges Grunnlov',
    );
    t.is(
        await getWikipediaArticleTitleOfTheDay(addDays(START_DATE, 2)),
        'Gustav Holst',
    );
    t.is(
        await getWikipediaArticleTitleOfTheDay(addDays(START_DATE, 3)),
        'Mata Hari',
    );
});

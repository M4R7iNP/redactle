import t from 'tap';
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
    }
);

t.test('getWikipediaArticleTitleOfTheDay()', async (t) => {
    t.equal(
        await getWikipediaArticleTitleOfTheDay(addDays(START_DATE, 0)),
        'Mata Hari'
    );
    t.equal(
        await getWikipediaArticleTitleOfTheDay(addDays(START_DATE, 1)),
        'Norges Grunnlov'
    );
    t.equal(
        await getWikipediaArticleTitleOfTheDay(addDays(START_DATE, 2)),
        'Gustav Holst'
    );
});

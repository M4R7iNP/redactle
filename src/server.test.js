import test from 'ava';
import esmock from 'esmock';
import ioredis from 'ioredis-mock';
import { WebSocket } from 'ws';
import getPort from 'get-port';

/** @type {import('./server.js').default} */
const server = await esmock(
    './server.js',
    {},
    {
        ioredis,
        './getWikipediaArticleTitleOfTheDay.js': () => 'Mata Hari',
    },
);

const port = await getPort();

test.before(() => {
    server.listen(port);
});

test.after(() => {
    server.close();
});

const GAME_ID = 'test';

const createWebsocketQueue = (ws) => {
    let queue = [];
    let _pendingResolve;
    const handler = (ev) => {
        queue.push(JSON.parse(ev.data));
        if (_pendingResolve) {
            _pendingResolve(queue.shift());
            _pendingResolve = undefined;
        }
    };
    ws.addEventListener('message', handler);

    return () =>
        new Promise((resolve, reject) => {
            if (queue.length) {
                resolve(queue.shift());
            } else {
                const t = setTimeout(() => reject(new Error('timeout')), 5000);
                _pendingResolve = (data) => {
                    clearTimeout(t);
                    resolve(data);
                };
            }
        });
};

test('server.js', async (t) => {
    const addr = server.address();
    const clientA = new WebSocket(
        `ws://localhost:${
            addr.port
        }?gameId=${GAME_ID}&playerId=a&emoji=${encodeURIComponent('💩')}`,
    );
    const a = createWebsocketQueue(clientA);
    t.like(await a(), { action: 'PLAYER_JOINED' });
    t.like(await a(), { action: 'GAME_STATE', guesses: [] });

    const clientB = new WebSocket(
        `ws://localhost:${
            addr.port
        }?gameId=${GAME_ID}&playerId=b&emoji=${encodeURIComponent('🌈')}`,
    );
    const b = createWebsocketQueue(clientB);
    t.like(await b(), { action: 'PLAYER_JOINED' });
    t.like(await b(), { action: 'GAME_STATE', guesses: [] });
    t.like(await a(), { action: 'PLAYER_JOINED' });

    // First guess, should match
    clientA.send(JSON.stringify({ action: 'GUESS', word: 'spion' }));
    const expectedGuess = {
        action: 'GUESS',
        guess: { word: 'spion', emoji: '💩' },
    };
    let msg;
    t.like((msg = await a()), expectedGuess);
    t.like(await b(), expectedGuess);
    t.true(msg.guess.occurrences > 0);

    clientB.send(JSON.stringify({ action: 'GUESS', word: 'spion' }));
    t.like(await b(), { action: 'EXISTING_GUESS' });

    // Second guess, should not match
    clientB.send(
        JSON.stringify({ action: 'GUESS', word: 'aaaaaaaaaaaaaaaaaaaaaaaa' }),
    );
    const expectedGuess2 = {
        action: 'GUESS',
        guess: {
            word: 'aaaaaaaaaaaaaaaaaaaaaaaa',
            emoji: '🌈',
            occurrences: 0,
        },
    };
    t.like(await b(), expectedGuess2);
    t.like(await a(), expectedGuess2);

    // test SET_EMOJI
    const tada = '🎉';
    clientA.send(JSON.stringify({ action: 'SET_EMOJI', emoji: tada }));
    t.is((await a()).guesses[0].emoji, tada);
    t.is((await b()).guesses[0].emoji, tada);

    clientA.close();
    clientB.close();
});

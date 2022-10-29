import t from 'tap';
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
    }
);

const port = await getPort();

t.before((done) => {
    server.listen(port, done);
});

t.teardown(() => {
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

t.test('server.js', async (t) => {
    const addr = server.address();
    const clientA = new WebSocket(
        `ws://localhost:${
            addr.port
        }?gameId=${GAME_ID}&playerId=a&emoji=${encodeURIComponent('💩')}`
    );
    const a = createWebsocketQueue(clientA);
    t.has(await a(), { action: 'PLAYER_JOINED' });
    t.has(await a(), { action: 'GAME_STATE', guesses: [] });

    const clientB = new WebSocket(
        `ws://localhost:${
            addr.port
        }?gameId=${GAME_ID}&playerId=b&emoji=${encodeURIComponent('🌈')}`
    );
    const b = createWebsocketQueue(clientB);
    t.has(await b(), { action: 'PLAYER_JOINED' });
    t.has(await b(), { action: 'GAME_STATE', guesses: [] });
    t.has(await a(), { action: 'PLAYER_JOINED' });

    // First guess, should match
    clientA.send(JSON.stringify({ action: 'GUESS', word: 'spion' }));
    const expectedGuess = {
        action: 'GUESS',
        guess: { word: 'spion', emoji: '💩' },
    };
    let msg;
    t.has((msg = await a()), expectedGuess);
    t.has(await b(), expectedGuess);
    t.ok(msg.guess.occurrences > 0);

    clientB.send(JSON.stringify({ action: 'GUESS', word: 'spion' }));
    t.has(await b(), { action: 'EXISTING_GUESS' });

    // Second guess, should not match
    clientB.send(
        JSON.stringify({ action: 'GUESS', word: 'aaaaaaaaaaaaaaaaaaaaaaaa' })
    );
    const expectedGuess2 = {
        action: 'GUESS',
        guess: {
            word: 'aaaaaaaaaaaaaaaaaaaaaaaa',
            emoji: '🌈',
            occurrences: 0,
        },
    };
    t.has(await b(), expectedGuess2);
    t.has(await a(), expectedGuess2);

    // test SET_EMOJI
    const tada = '🎉';
    clientA.send(JSON.stringify({ action: 'SET_EMOJI', emoji: tada }));
    t.equal((await a()).guesses[0].emoji, tada);
    t.equal((await b()).guesses[0].emoji, tada);

    clientA.close();
    clientB.close();
});

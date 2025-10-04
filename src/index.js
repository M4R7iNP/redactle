import server from './server.js';

const port = parseInt(process.env.PORT || '8090');
server.listen(port, () => {
    // @ts-ignore
    console.log('Listening on http://localhost:%d', server.address().port);
});

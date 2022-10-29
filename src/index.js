import 'dotenv/config';
import server from './server.js';

const port = parseInt(process.env.PORT || '8090');
server.listen(port, () => {
    console.log('Listening on http://localhost:%d', server.address().port);
});

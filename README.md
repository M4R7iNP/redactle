# Martins Redactle (aka Sladdactle Unlimited)

_https://redactle.darthvader.no/_

Original Norwegian project: https://github.com/olafmoriarty/sladdactle

### Setup

### External dependencies
 * Redis
 * * put the redis password in `.env` as `REDIS_PASSWORD=`

```bash
# Install node.js dependencies
npm i

# Download and process dictionary and article list
make

# Build client-side css and js
npm run build

# Start server
npm run dev
```

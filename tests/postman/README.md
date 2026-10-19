# Postman / Newman

`qa-orders.postman_collection.json` is generated from `generate-collection.js` (`npm run generate`).
Import the JSON + `local.postman_environment.json` into Postman, or run headless: `npm install && npm test`.
Folders 00-09 run in order (setup registers two users and stores tokens in collection variables).

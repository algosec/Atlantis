const http = require('http');
const {handler} = require('./handler');
const globalConfig = require("../shared/src/globalConfig");
const PORT = process.argv[2];

// see https://github.com/OfficeDev/msteams-samples-outgoing-webhook-nodejs/blob/master/app.js
// see http://www.wictorwilen.se/creating-a-bot-for-microsoft-teams-using-microsoft-flow

// override it for development environment
process.env.BASE_URL = 'http://localhost:3000';
process.env.TEAMS_SECRETS = globalConfig.teams.secrets;
process.env.SKIP_TRUST_CHECK = true;
process.env.REST_ACCESS_KEY = '<paste-jwt-token-here>';

http.createServer((req, res) => {
    let payload = '';
    req.on('data', data => payload += data);
    req.on('end', async () => {
        const response = await handler({
            headers: req.headers,
            body: payload
        });
        console.log("Response:", response);
        res.writeHead(response.statusCode);
        res.write(response.body);
        res.end();
    });
}).listen(PORT);

console.log('Bot Bridge Development Server is listening on port %s', PORT);
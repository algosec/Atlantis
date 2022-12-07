const crypto = require('crypto');
const request = require('request');
const globalConfig = require("../shared/src/globalConfig");

const secretsStr = JSON.parse(process.env.TEAMS_SECRETS);
const values = Object.values(secretsStr);
const secrets = values.map(str => Buffer.from(str, "base64"));

function isTrusted(auth, payload) {
    if (process.env.SKIP_TRUST_CHECK) {
        return true;
    }
    return secrets.some(secret => {
        const msgBuf = Buffer.from(payload, 'utf8');
        const msgHash = "HMAC " + crypto.createHmac('sha256', secret).update(msgBuf).digest("base64");
        // console.log(`msgHash=${msgHash}`);
        // console.log(`auth=${auth}`);
        return auth === msgHash;
    });
}

function composeResponse(resBody) {
    return {
        statusCode: 200,
        body: resBody
    };
}

function composeErrorResponse(message) {
    return composeResponse(JSON.stringify({
        type: "message",
        text: message
    }));
}
exports.handler = (event) => {
    return new Promise((resolve, reject) => {
        const auth = event.headers && (event.headers['Authorization'] || event.headers['authorization']);
        const payload = event.body;

        if (!auth || !payload) {
            resolve(composeErrorResponse('Error: no info provided'));
            return;
        }

        if (!isTrusted(auth, payload)) {
            resolve(composeErrorResponse('Error: message sender cannot be authenticated'));
            return;
        }

        // prepare request
        const baseUrl = process.env.BASE_URL || globalConfig.basicApplicationUrl+'/api/v1';
        const targetEndpointUrl = `${baseUrl}/notification/mark-reviewed`;
        const requestOptions = {
            body: payload,
            headers: {
                'content-type': 'application/json',
                'Authorization': 'JWT ' + process.env.REST_ACCESS_KEY
            },
            rejectUnauthorized: false
        };

        // execute request
        request.post(targetEndpointUrl, requestOptions, (error, response, body) => {
            let returnObject;

            if (error) {
                const message = "Error: a fatal occurred while contacting backend server";
                console.error(message, error);
                returnObject = composeErrorResponse(message); // override the returned body
            } else if (response.statusCode !== 200) {
                const message = `Error: backend server returned ${response.statusCode}: ${body}`;
                console.error(message);
                returnObject = composeErrorResponse(message); // override the returned body
            } else {
                returnObject = composeResponse(body);
            }

            console.log('final response ' +  JSON.stringify(returnObject));

            resolve(returnObject);
        });
    });
};
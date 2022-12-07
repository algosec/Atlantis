export const globalConfig = {
    tenantDetails: {
        tenantName: "",
        tenantId: ""
    },
    emailDetails: {
        domain: "",
        sendMessageUrl: ""
    },
    jiraUrl: "",
    basicApplicationUrl: "",
    JWTKeys: {
        privateKey:
            '-----BEGIN RSA PRIVATE KEY-----\n' +

            '-----END RSA PRIVATE KEY-----\n',

        publicKey: '-----BEGIN PUBLIC KEY-----\n' +
                  '-----END PUBLIC KEY-----\n'
    },
    JWTAllureToken: {
        nonProduction: "",
        production: ""
    },
    teams: {
        //change to my team
        postMessageURL: "",
        postReplayURL: null, //not used atm
        secrets: {
            "": ""
        }
    },
    buckets: [
        {
            title: "",
            prefix: [""],
            suffix: []
        },
        {
            title: "",
            prefix: [""],
            suffix: []
        }
    ],
    localLogin: {
        allowInProduction: true
    }
}

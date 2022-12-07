export const globalConfig = {
    tenantDetails: {
        tenantName: "<tenant name>",
        tenantId: "<tenant Id>"
    },
    emailDetails: {
        domain: "<organization email such as @gmail. example: @algosec>",
        sendMessageUrl: "<url address to send emails from ??? >"
    },
    jiraUrl: "<organizations jira full url>",
    basicApplicationUrl: " <Atlantis host url adress> ",
    JWTKeys: {
        privateKey: '<JWT private key> ',
        publicKey: '<JWT public key> '
    },
    JWTAllureToken: {
        nonProduction : "<token with authenticated user details>",
        production : "<token with authenticated user details>"
    },
    teams : {
        postMessageURL : "<url with post action to team>",
        postReplayURL : "<currently not in use, can be null>",
        secrets : {
            "<version1>" : "<secret>",
            "<version2>" : "<secret>"
      }
    },
    // a list of buckets, will appear as components
    buckets: [
        {
            title: "<first bucket title>",
            prefix: ["<first bucket prefix>"],
            suffix: []
        },
        {
            title: "<second bucket title>",
            prefix: ["<second bucket prefix>"],
            suffix: []
        }

    ],
    localLogin: {
        allowInProduction: true
        }
}

export default globalConfig;
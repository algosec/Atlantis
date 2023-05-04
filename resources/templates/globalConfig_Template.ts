export const globalConfig = {
    tenantDetails: {
        tenantName: "<tenant name>",
        tenantId: "<tenant Id>"
    },
    emailDetails: {
        domain: "<organization email such as @gmail. example: @algosec>",
        sendMessageUrl: "< use  Microsoft's Power Automate to generate this url. more info under Atlantis/docs/email and teams integrations.md >"
    },
    jiraUrl: "<organizations jira's full url>",
    basicApplicationUrl: " < Youre wished Atlantis host url address> ",
    JWTKeys: {
        privateKey: '<JWT private key> ',
        publicKey: '<JWT public key> '
		// generate your keys.
		// You can generate jwt keys using: 
		// openssl genrsa -out jwt.key 2048
		// openssl rsa -in jwt.key -outform PEM -pubout -out jwt.crt
    },
    JWTAllureToken: {
        nonProduction : "<token with authenticated user details>",
        production : "<token with authenticated user details>"
		// generate tokens (using your private and public key) with the following information:
		// header: 
		//		{
		//			"alg": "RS256",
		//		   	"typ": "JWT"
		//		}
		// payload:
		// 		{
		//			"userId": "< a uuid of a valid user. Generate this id and use it later for your first user in the db >",
		//			"tenantId": "< your tenant id from above >",
		//			"roles": [
		//			"Admin"
		//			],
		//			"iat": 1636551082,
		//			"iss": "ms-auth",
		//			"sub": "<any uuid> "
		//		} 
    },
    teams : {
        postMessageURL : "< use  Microsoft's Power Automate to generate this url. more info under Atlantis/docs/email and teams integrations.md >",
        postReplayURL : "<currently not in use, should be null>",
        secrets : {
            "<version1>" : "<secret>",
            "<version2>" : "<secret>"
      }
    },
    localLogin: {
        allowInProduction: true
        }
}

export default globalConfig;

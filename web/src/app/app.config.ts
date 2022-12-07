export const config = {
    auth: {
        jwt: {
            refreshTokenBeforeSeconds: 60,
            refreshTokenDecrementsSeconds: 10,
        },
        logoutFlag: 'auth.logout-flag',
        accessTokenExcludeApi: [
            '/api/auth/login',
            '/api/auth/jwt'
        ]
    },
    baseUrl: '/api/v1',
    baseUrlAuth: '/api/auth'
};
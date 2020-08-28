function getConfig() {
    return {
        clientId: process.env.SYSTEM_CLIENTID,
        clientSecret: process.env.SYSTEM_CLIENTSECRET
    }
}

module.exports = getConfig
require('dotenv').config()
const express = require("express")
const bodyParser = require("body-parser")
const request = require("request-promise-native")
const passport = require("passport")
const BasicStrategy = require("passport-http").BasicStrategy

const { PatientCacheProvider, PendingPatientStatus } = require("./providers/patientcache.provider")
const RedisDataProvider = require("./providers/redis.dataprovider")
const PixDataProvider = require("./providers/pix.dataprovider")
const FhirStoreDataProvider = require("./providers/fhirstore.dataprovider")
const TokenProvider = require("./providers/token.provider")
const AuthProvider = require("./providers/fhirstore.authprovider")
const { JobType, JobProducerProvider } = require("./jobs/jobproducer.provider")
const { JobConsumerProvider } = require("./jobs/jobconsumer.provider")
const { getProducerConfig, getConsumerConfig } = require("./config/config.job")
const getFhirStoreConfig = require("./config/config.fhirstore")
const getFhirAuthConfig = require("./config/config.fhirauth")
const getPixAuthConfig = require("./config/config.pixauth")
const getRedisConfig = require("./config/config.redis")
const getPixConfig = require("./config/config.pix")
const { buildLogger } = require("./logger")
const getAuthConfig = require("./config/config.auth")

const { logger } = buildLogger("job_service")

const app = express()

app.use(bodyParser.json())

passport.use(new BasicStrategy(
    function(userid, password, done) {
        const { clientId, clientSecret } = getAuthConfig()

        if (userid !== clientId && password !== clientSecret) {
            done(null, false)
        } else {
            done(null, true)
        }
    }
))

app.post("/internal/jobs/patientlogin", passport.authenticate('basic', { session: false }), async (req, res) => {
    const cacher = new RedisDataProvider(getRedisConfig())

    const { token } = req.body
    let { nhsNumber } = req.body

    const { registerpatientconsumer } = getConsumerConfig()

    if (registerpatientconsumer.mock && registerpatientconsumer.nhsNumberMap[nhsNumber]) {
        nhsNumber = registerpatientconsumer.nhsNumberMap[nhsNumber]
    } 

    const cacheProvider = new PatientCacheProvider(cacher)

    await cacheProvider.setPendingPatientStatus(nhsNumber, PendingPatientStatus.Received)

    const jobProducerProvider = new JobProducerProvider(getProducerConfig())

    const jobType = JobType.RegisterPatientJob

    const jobProducer = jobProducerProvider.getJobProducer(jobType)

    await jobProducer.addJob(jobType, { nhsNumber, token })

    res.status(200).send({})
})

app.post("/internal/status", passport.authenticate('basic', { session: false }), async (req, res) => {
    let { nhsNumber } = req.body

    const { registerpatientconsumer } = getConsumerConfig()

    if (registerpatientconsumer.mock && registerpatientconsumer.nhsNumberMap[nhsNumber]) {
        nhsNumber = registerpatientconsumer.nhsNumberMap[nhsNumber]
    } 

    const cacher = new RedisDataProvider(getRedisConfig())

    const cacheProvider = new PatientCacheProvider(cacher)

    const patientStatus = await cacheProvider.getPendingPatientStatus(nhsNumber)

    res.status(200).json({ status: patientStatus })
})

app.use(function(err, req, res, next) {
    logger.error(err.message, { stack: err.stack })
    res.status(500).json({ error: "An error ocurred" })

    next()
})

let pendingConsumer = null
let lookupConsumer = null

app.listen(8777, () => {
    const auth = new AuthProvider(getFhirAuthConfig(), logger, "2")
    const pixauth = new AuthProvider(getPixAuthConfig(), logger, "2")
    const adminAuth = new AuthProvider(getFhirAuthConfig(), logger, "5")
    const adminTokenProvider = new TokenProvider(adminAuth, logger)
    const pixTokenProvider = new TokenProvider(pixauth, logger)
    const tokenProvider = new TokenProvider(auth, logger)
    const fhirDataProvider = new FhirStoreDataProvider(getFhirStoreConfig(), logger, tokenProvider)
    const adminFhirDataProvider = new FhirStoreDataProvider(getFhirStoreConfig(), logger, adminTokenProvider)
    const pixDataProvider = new PixDataProvider(getPixConfig(), logger, pixTokenProvider)

    const cacher = new PatientCacheProvider(new RedisDataProvider(getRedisConfig()))

    const jobProducerProvider = new JobProducerProvider(getProducerConfig())

    const jobConsumerProvider = new JobConsumerProvider(
        getConsumerConfig(),
        jobProducerProvider,
        pixDataProvider,
        fhirDataProvider,
        cacher,
        logger,
        adminFhirDataProvider
    )

    pendingConsumer = jobConsumerProvider.getJobConsumer(JobType.RegisterPatientJob)
    lookupConsumer = jobConsumerProvider.getJobConsumer(JobType.LookupPatientJob)

    pendingConsumer.consumeJob()
    lookupConsumer.consumeJob()
})
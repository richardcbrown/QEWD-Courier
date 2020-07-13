const winston = require("winston")
require("winston-daily-rotate-file")

class LoggerStream {
    constructor(logger) {
        this.logger = logger
    }

    write(text) {
        this.logger.info(text)
    }
}

function buildLogger(logBasePath) {
    const errorTransport = new winston.transports.DailyRotateFile({
        level: "error",
        filename: `logs/${logBasePath}/error-%DATE%.log`,
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "2d"
    })

    const infoTransport = new winston.transports.DailyRotateFile({
        level: "info",
        filename: `logs/${logBasePath}/logs-%DATE%.log`,
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "2d"
    })

    const logger = winston.createLogger({
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.errors({ stack: true })
        ),
        transports: [errorTransport, infoTransport]
    })

    // Call exceptions.handle with a transport to handle exceptions
    logger.exceptions.handle(errorTransport)

    const loggerStream = new LoggerStream(logger)

    return { logger, loggerStream }
}

module.exports = { buildLogger, LoggerStream }
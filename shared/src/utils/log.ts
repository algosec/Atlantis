import {createLogger, format, transports} from 'winston';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

export default createLogger({
    level: LOG_LEVEL,
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    transports: [
        new transports.Console({
            level: LOG_LEVEL,
            format: format.combine(
                format.colorize(),
                format.printf(log => {
                    return `[${log.timestamp}] [${log.level}] ${log.message}${log.stack ? `\n${log.stack}` : ''}`;
                })
            )
        })
    ]
});
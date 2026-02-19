import * as winston from 'winston'
const isDevelopment = process.env.NODE_ENV !== 'production'
export const loggerConfig = {
  level: isDevelopment ? 'debug' : 'info', // 環境差異：開發詳細，生產簡潔
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    // 📁 文件：所有日誌
    new winston.transports.File({
      filename: 'logs/app.log',
      maxsize: 5_242_880, // 5MB
      maxFiles: 5,
      level: isDevelopment ? 'debug' : 'info', // 區分環境級別
    }),
    // 📁 文件：僅錯誤
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5_242_880,
      maxFiles: 5,
    }),
    // 📊 控制台：開發用（生產環境不輸出）
    ...(isDevelopment
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({ level, message, timestamp }) => `${String(timestamp)} [${level}] ${String(message)}`
              )
            ),
          }),
        ]
      : []),
  ],
}

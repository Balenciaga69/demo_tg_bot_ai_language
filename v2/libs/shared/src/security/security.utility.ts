import type { INestApplication } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { doubleCsrf } from 'csrf-csrf'
/**
 * 設置全域安全中介軟體
 * 包含: Helmet (安全標頭)、Cookie Parser、CORS、CSRF 保護
 *
 * @param app NestJS 應用實例
 * @example
 * const app = await NestFactory.create(AppModule);
 * setupSecurity(app);
 */
export function setupSecurity(app: INestApplication): void {
  setupHelmet(app)
  setupCookieParser(app)
  setupCors(app)
  setupCsrfProtection(app)
}
function setupHelmet(app: INestApplication): void {
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Swagger 需要 inline styles
            'cdn.jsdelivr.net',
            'fonts.googleapis.com',
          ],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Swagger 需要 inline scripts
            'cdn.jsdelivr.net',
          ],
          imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
          fontSrc: ["'self'", 'fonts.gstatic.com', 'data:'],
        },
      },
    })
  )
}
function setupCookieParser(app: INestApplication): void {
  app.use(cookieParser())
}
function setupCors(app: INestApplication): void {
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000'
  const corsOrigins = corsOrigin.split(',').map((origin) => origin.trim())
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 86_400, // 24 小時
  })
}
function setupCsrfProtection(app: INestApplication): void {
  const { doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'your-secret-key-change-in-production',
    getSessionIdentifier: (request: { user?: { id?: string }; ip?: string }) => {
      return request.user?.id || request.ip || 'anonymous'
    },
    cookieName: '__Host-psifi.x-csrf-token',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  })
  app.use(doubleCsrfProtection)
}

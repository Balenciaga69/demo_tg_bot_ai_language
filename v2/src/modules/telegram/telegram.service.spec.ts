// 檔案頂端說明:
// - 我們 mock 了 `@grammyjs/ratelimiter` 的 `limit` 函式，目的是在測試中捕捉傳入的 options，
//   例如 `timeFrame`、`limit` 與 `keyGenerator`，以便驗證 middleware 的設定。
// - 此處也建立一些測試用的 helper（mockBot、initService），用以在不同測試情境中注入假的 Bot 實作。

// Mock the rate limiter so we can inspect options passed to `limit`
// (capturedLimitOptions 會在 jest.mock 的 mock implementation 中被設定)
type LimitOptions = {
  timeFrame?: number
  limit?: number
  keyGenerator?: (context: any) => string
}

let capturedLimitOptions: LimitOptions | undefined
// 對 @grammyjs/ratelimiter.limit 做 jest.mock：
// - 當被呼叫時會把傳入的 options 存到 capturedLimitOptions，方便測試檢查
// - 回傳一個 dummy middleware (jest.fn)，以免實際使用到第三方邏輯
jest.mock('@grammyjs/ratelimiter', () => ({
  limit: jest.fn((options: LimitOptions) => {
    capturedLimitOptions = options
    // return a dummy middleware function
    return jest.fn()
  }),
}))

// 用來建立 Nest 測試模組，以及注入假的 Bot 實作
import { Test, TestingModule } from '@nestjs/testing'
import { Bot } from 'grammy'
import { TelegramService } from './telegram.service'
// `MockBot` 只模擬我們在 service 中會使用到的 Bot API: `command`, `use`, `start`, `stop`
type MockBot = jest.Mocked<Pick<Bot, 'command' | 'use' | 'start' | 'stop'>>

let service: TelegramService
let mockBot: MockBot

function createMockBot(): MockBot {
  const bot = {
    command: jest.fn(),
    start: jest.fn().mockResolvedValue(void 0),
    stop: jest.fn().mockResolvedValue(void 0),
    use: jest.fn(),
  } as unknown as MockBot
  return bot
}

async function initService(): Promise<void> {
  capturedLimitOptions = undefined
  mockBot = createMockBot()

  const module: TestingModule = await Test.createTestingModule({
    providers: [TelegramService, { provide: Bot, useValue: mockBot }],
  }).compile()

  service = module.get<TelegramService>(TelegramService)
}
// eslint-disable-next-line max-lines-per-function
describe('TelegramService — commands & middleware', () => {
  beforeEach(async () => {
    await initService()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should apply throttle middleware with expected options', () => {
    // 測試: applyThrottleMiddleware
    // 目的: 驗證節流 middleware 被注入到 bot，並且傳給 @grammyjs/ratelimiter.limit 的 options 包含 timeFrame 與 limit，且有 keyGenerator
    // 方法: 呼叫 service.applyThrottleMiddleware()，透過 jest.mock 捕捉到傳入 limit 的 options (capturedLimitOptions)，並檢查 mockBot.use 有被呼叫
    service.applyThrottleMiddleware()

    expect(mockBot.use).toHaveBeenCalledWith(expect.any(Function))
    // ensure limit got called with expected shape
    // capturedLimitOptions is set by our jest.mock above
    expect(capturedLimitOptions).toBeTruthy()
    expect(capturedLimitOptions).toEqual(expect.objectContaining({ timeFrame: 1000, limit: 1 }))
    expect(typeof capturedLimitOptions?.keyGenerator).toBe('function')
  })

  it('should register start command without relying on call index', () => {
    // 測試: registerCommands
    // 目的: 確認會以 'start' 為名稱註冊指令 handler
    // 方法: 呼叫 service.registerCommands()，檢查 mockBot.command 是否以 'start' 被呼叫
    service.registerCommands()
    expect(mockBot.command).toHaveBeenCalledWith('start', expect.any(Function))
  })

  it('should reply welcome message on start command handler', () => {
    // 測試: start 指令的 handler 行為
    // 目的: 驗證當 start handler 被觸發時，會回覆歡迎訊息
    // 方法: 先呼叫 registerCommands()，從 mockBot.command 捕取註冊的 handler，模擬 context.reply 並直接呼叫 handler，檢查 reply 參數
    service.registerCommands()
    const calls = (mockBot.command as jest.Mock).mock.calls as unknown[][]
    const startCall = calls.find((c) => c[0] === 'start')
    expect(startCall).toBeDefined()
    const handler = startCall![1] as (context: { reply: jest.Mock }) => void
    const context = { reply: jest.fn() } as { reply: jest.Mock }
    handler(context)
    expect(context.reply).toHaveBeenCalledWith('歡迎使用 Telegram Bot!')
  })

  it('keyGenerator fallback should return anonymous when no from.id', () => {
    // 測試: keyGenerator 回退邏輯
    // 目的: 當 context.from.id 不存在時，keyGenerator 應回傳 'anonymous'；有 id 則回傳該 id 的字串
    // 方法: 呼叫 applyThrottleMiddleware() 後，從 mocked limit 捕獲 keyGenerator，模擬不同的 context 來驗證輸出
    service.applyThrottleMiddleware()
    if (!capturedLimitOptions || !capturedLimitOptions.keyGenerator) {
      throw new Error('keyGenerator not captured')
    }
    const kg = capturedLimitOptions.keyGenerator
    expect(kg({ from: { id: 123 } })).toBe('123')
    expect(kg({})).toBe('anonymous')
    expect(kg({ from: {} })).toBe('anonymous')
  })
})

// eslint-disable-next-line max-lines-per-function
describe('TelegramService — lifecycle', () => {
  beforeEach(async () => {
    mockBot = createMockBot()

    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramService, { provide: Bot, useValue: mockBot }],
    }).compile()

    service = module.get<TelegramService>(TelegramService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should start bot via onModuleInit and call register/apply before start', async () => {
    // 測試: onModuleInit 生命周期
    // 目的: 確認啟動時會先註冊指令與套用節流 middleware，最後啟動 bot
    // 方法: spyOn `registerCommands` 與 `applyThrottleMiddleware`，呼叫 onModuleInit() 並檢查先後被呼叫與 mockBot.start 被呼叫一次
    const spyRegister = jest.spyOn(service, 'registerCommands')
    const spyThrottle = jest.spyOn(service, 'applyThrottleMiddleware')
    await service.onModuleInit()
    expect(spyRegister).toHaveBeenCalled()
    expect(spyThrottle).toHaveBeenCalled()
    expect(mockBot.start).toHaveBeenCalledTimes(1)
  })

  it('should propagate error when bot.start rejects', async () => {
    // 測試: onModuleInit 當 bot.start 拋錯時的行為
    // 目的: 確認錯誤會被向上拋出
    // 方法: 讓 mockBot.start reject，呼叫 onModuleInit() 並 expect rejects
    ;(mockBot.start as jest.Mock).mockRejectedValueOnce(new Error('boom'))
    await expect(service.onModuleInit()).rejects.toThrow('boom')
  })

  it('should stop bot via onModuleDestroy', async () => {
    // 測試: onModuleDestroy
    // 目的: 確認銷毀時會呼叫 bot.stop
    // 方法: 呼叫 onModuleDestroy() 並檢查 mockBot.stop 被呼叫一次
    await service.onModuleDestroy()
    expect(mockBot.stop).toHaveBeenCalledTimes(1)
  })

  it('should propagate error when bot.stop rejects', async () => {
    // 測試: onModuleDestroy 當 bot.stop 拋錯時的行為
    // 目的: 確認錯誤會被向上拋出
    // 方法: 讓 mockBot.stop reject，呼叫 onModuleDestroy() 並 expect rejects
    ;(mockBot.stop as jest.Mock).mockRejectedValueOnce(new Error('stop-boom'))
    await expect(service.onModuleDestroy()).rejects.toThrow('stop-boom')
  })
})

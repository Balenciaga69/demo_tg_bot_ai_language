import { Test, TestingModule } from '@nestjs/testing'
import { Bot } from 'grammy'
import { TelegramService } from './telegram.service'

let service: TelegramService
let mockBot: { command: jest.Mock; start: jest.Mock; stop: jest.Mock; use: jest.Mock }

const createMockBot = () => ({
  command: jest.fn(),
  start: jest.fn().mockResolvedValue(void 0),
  stop: jest.fn().mockResolvedValue(void 0),
  use: jest.fn(),
})

describe('TelegramService — commands & middleware', () => {
  beforeEach(async () => {
    mockBot = createMockBot()

    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramService, { provide: Bot, useValue: mockBot }],
    }).compile()

    service = module.get<TelegramService>(TelegramService)
  })

  it('should apply throttle middleware', () => {
    service.applyThrottleMiddleware()
    const useCalls = mockBot.use.mock.calls as unknown as unknown[][]
    expect(useCalls.length).toBeGreaterThan(0)
    expect(useCalls[0][0]).toEqual(expect.any(Function))
  })

  it('should return bot instance', () => {
    expect(service.getBotInstance()).toBe(mockBot)
  })

  it('should register start command', () => {
    service.registerCommands()
    const commandCalls = mockBot.command.mock.calls as unknown as unknown[][]
    expect(commandCalls.length).toBeGreaterThan(0)
    expect(commandCalls[0][0]).toBe('start')
    expect(commandCalls[0][1]).toEqual(expect.any(Function))
  })

  it('should reply welcome message on start command', () => {
    service.registerCommands()
    const commandCalls = mockBot.command.mock.calls as unknown as unknown[][]
    const callback = commandCalls[0][1] as (context: { reply: jest.Mock }) => void
    const context = { reply: jest.fn() }
    callback(context)
    const replyCalls = context.reply.mock.calls as unknown as unknown[][]
    expect(replyCalls.length).toBeGreaterThan(0)
    expect(replyCalls[0][0]).toBe('歡迎使用 Telegram Bot!')
  })
})

describe('TelegramService — lifecycle', () => {
  beforeEach(async () => {
    mockBot = createMockBot()

    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramService, { provide: Bot, useValue: mockBot }],
    }).compile()

    service = module.get<TelegramService>(TelegramService)
  })

  it('should start bot via startBot', async () => {
    await service.startBot()
    const startCalls = mockBot.start.mock.calls as unknown as unknown[][]
    expect(startCalls.length).toBeGreaterThan(0)
  })

  it('should stop bot via dispose', async () => {
    await service.dispose()
    const stopCalls = mockBot.stop.mock.calls as unknown as unknown[][]
    expect(stopCalls.length).toBeGreaterThan(0)
  })
})

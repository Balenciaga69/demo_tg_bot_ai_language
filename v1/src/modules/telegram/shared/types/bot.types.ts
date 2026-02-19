import { Conversation, ConversationFlavor } from '@grammyjs/conversations'
import { Bot, Context } from 'grammy'
// 外部上下文（Outside Context）- 在對話外的 middleware
export type BotContext = ConversationFlavor<Context>
// 內部上下文（Inside Context）- 在對話內
export type ConversationContext = Context
// 對話型別
export type BotConversation = Conversation<BotContext, ConversationContext>
// 擴展 Bot 類型，包含對話功能
export type MyBot = Bot<BotContext>

/**
 * Redis 序列化工具 - 透明處理 Date/JSON 轉換
 * 避免 Date 直接序列化為字符串，統一使用毫秒時間戳
 */
export const RedisSerializer = {
  /**
   * 序列化物件為 JSON 字符串
   * 自動處理 Date 類型轉換為毫秒時間戳
   *
   * @param data 要序列化的物件
   * @returns JSON 字符串
   *
   * @example
   * const data = { id: '123', createdAt: new Date() }
   * const json = RedisSerializer.stringify(data)
   * // {"id":"123","createdAt":1707898000000}
   */
  stringify<T extends Record<string, any>>(data: T): string {
    return JSON.stringify(data, (key, value): any => {
      if (value instanceof Date) {
        return value.getTime() // Date -> 毫秒時間戳
      }
      return value
    })
  },
  /**
   * 反序列化 JSON 字符串為物件
   * 自動恢復指定字段為 Date 類型
   *
   * @param json JSON 字符串
   * @param dateFields 需要恢復為 Date 的字段名列表
   * @returns 反序列化後的物件
   *
   * @example
   * const json = '{"id":"123","createdAt":1707898000000}'
   * const data = RedisSerializer.parse<MyType>(json, ['createdAt'])
   * // { id: '123', createdAt: Date(...) }
   */
  parse<T extends Record<string, any>>(json: string, dateFields: string[] = []): T {
    return JSON.parse(json, (key, value): any => {
      if (dateFields.includes(key) && typeof value === 'number') {
        return new Date(value) // 毫秒時間戳 -> Date
      }
      return value
    }) as T
  },
}

管理依賴
版本對齊：確保所有應用程式（Apps）和函式庫（Libs）使用的 NestJS 版本一致。如果 A 專案用 v9，B 專案用 v10，會導致極其難纏的編譯錯誤。
編譯路徑：開發時 ts-node 會處理路徑，但正式環境打包時，必須確保 nest build 能正確解析這些路徑並將其轉換為相對路徑。

Library 的邊界與職責
Monorepo 的核心價值在於 Shared Libraries，但要小心「過度耦合」
避免循環引用：Library A 引用 B，B 又引用 A，這會導致編譯失敗。
Domain 隔離：將通用的邏輯（如資料庫 Entity、DTO、驗證邏輯）放入 Libs，但具體的業務邏輯應留在各自的 Apps 中。

CI/CD 與建置效能
當專案變多時，每次改動都重新測試、編譯所有專案會非常耗時：
增量建置 (Incremental Builds)：使用工具如 Nx 或 Turborepo 來識別哪些專案被更動過，僅針對受影響的部分執行測試與打包。
測試策略：確保單元測試可以針對單一 Lib 執行，而不是每次都要啟動整個 Monorepo。

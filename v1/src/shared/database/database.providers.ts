import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { EnvironmentKey } from '../environment-key'
export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async (configService: ConfigService): Promise<DataSource> => {
      const dataSource = new DataSource({
        type: 'postgres',
        host: configService.get<string>(EnvironmentKey.DB_HOST),
        port: configService.get<number>(EnvironmentKey.DB_PORT),
        username: configService.get<string>(EnvironmentKey.DB_USER),
        password: configService.get<string>(EnvironmentKey.DB_PASSWORD),
        database: configService.get<string>(EnvironmentKey.DB_NAME),
        // eslint-disable-next-line unicorn/prefer-module
        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
        synchronize: configService.get<boolean>(EnvironmentKey.DB_SYNCHRONIZE) ?? false,
        logging: configService.get<boolean>(EnvironmentKey.DB_LOGGING) ?? false,
      })
      return dataSource.initialize()
    },
    inject: [ConfigService],
  },
]

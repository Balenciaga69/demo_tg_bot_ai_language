module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@shared/audio$': '<rootDir>/shared/audio/src/index.ts',
    '^@shared/audio/(.*)$': '<rootDir>/shared/audio/src/$1',
    '^@shared/contracts$': '<rootDir>/shared/contracts/src/index.ts',
    '^@shared/contracts/(.*)$': '<rootDir>/shared/contracts/src/$1',
  },
}

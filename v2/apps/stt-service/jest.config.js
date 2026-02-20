export default {
  displayName: '@xx/stt-service',
  preset: '../../jest.preset.js',
  roots: ['<rootDir>/src'],
  passWithNoTests: true,
  moduleNameMapper: {
    '^@shared/audio$': '<rootDir>/../../shared/audio/src/index.ts',
    '^@shared/audio/(.*)$': '<rootDir>/../../shared/audio/src/$1',
    '^@shared/contracts$': '<rootDir>/../../shared/contracts/src/index.ts',
    '^@shared/contracts/(.*)$': '<rootDir>/../../shared/contracts/src/$1',
  },
}

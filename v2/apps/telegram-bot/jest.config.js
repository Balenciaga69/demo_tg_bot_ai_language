export default {
  displayName: '@xx/api-gateway',
  preset: '../../jest.preset.js',
  roots: ['<rootDir>/src'],
  passWithNoTests: true,
  moduleNameMapper: {
    '^@shared/contracts$': '<rootDir>/../../shared/contracts/src/index.ts',
    '^@shared/contracts/(.*)$': '<rootDir>/../../shared/contracts/src/$1',
  },
}

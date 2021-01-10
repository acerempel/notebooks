module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.[jt]s'],
  verbose: true,
  transform: {'\\.[jt]sx?$': 'ts-jest'}
};

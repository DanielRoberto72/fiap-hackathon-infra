import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  testRegex: '.*\\.e2e\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  testTimeout: 60_000,
  moduleFileExtensions: ['ts', 'js', 'json'],
};

export default config;

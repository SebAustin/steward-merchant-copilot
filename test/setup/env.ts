// Deterministic environment for every test file. Real values never come from a developer's .env.
process.env.TEST_DATABASE_URL ??= 'postgres://steward:steward@localhost:54329/steward_test'

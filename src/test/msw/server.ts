import { setupServer } from 'msw/node';

// Shared MSW server for contract / hook tests. Individual tests register their
// own handlers with `server.use(...)`; the global lifecycle (listen / reset /
// close) is wired in src/test/setup.ts. No default handlers — anything a test
// doesn't explicitly mock surfaces as an unhandled-request error so stray
// network calls can't pass silently.
export const server = setupServer();

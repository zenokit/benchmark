import { runBenchmarks } from './benchmark-runner';

const servers = [
  { 
    name: 'Zeno',
    script: './servers/zeno/index.ts',
    port: 3000
  },
  { 
    name: 'Express',
    script: './servers/express/index.ts',
    port: 3001
  },
  { 
    name: 'Fastify',
    script: './servers/fastify/index.ts',
    port: 3002
  },
  { 
    name: 'Hono',
    script: './servers/hono/index.ts',
    port: 3003
  }
];

// Configuration des tests
const tests = [
  {
    name: 'GET simple',
    endpoint: '/',
    method: 'GET',
    connections: 100,
    pipelining: 10,
    duration: 10
  },
  {
    name: 'GET avec param',
    endpoint: '/users/123',
    method: 'GET',
    connections: 100,
    pipelining: 10,
    duration: 10
  },
  {
    name: 'POST avec JSON',
    endpoint: '/api/data',
    method: 'POST',
    body: JSON.stringify({ hello: 'world' }),
    headers: { 'content-type': 'application/json' },
    connections: 100,
    pipelining: 10,
    duration: 10
  }
];

runBenchmarks(servers, tests);
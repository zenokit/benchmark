import { spawn, ChildProcess } from 'child_process';
import autocannon, { type Result } from 'autocannon';
import path from 'path';

interface ServerConfig {
  name: string;
  script: string;
  port: number;
}

interface TestConfig {
  name: string;
  endpoint: string;
  method: string;
  connections: number;
  pipelining: number;
  duration: number;
  body?: string;
  headers?: { [key: string]: string };
}

function startServer(serverConfig: ServerConfig): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const server = spawn('bun', ['run', 'index.ts'], {
      env: { ...process.env, PORT: serverConfig.port.toString() },
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: "./servers/" + serverConfig.name
    });
    
    let started = false;
    let output = '';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
      if (!started && (output.includes('listening') || output.includes('started') || output.includes('running'))) {
        started = true;
        resolve(server);
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error(`[${serverConfig.name}]`, data.toString());
    });
    
    server.on('error', (err) => {
      reject(err);
    });
    
    setTimeout(() => {
      if (!started) {
        resolve(server);
      }
    }, 5000);
  });
}

function stopServer(server: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    server.on('close', () => {
      resolve();
    });
    server.kill('SIGTERM');
    setTimeout(() => {
      if (!server.killed) {
        server.kill('SIGKILL');
      }
    }, 3000);
  });
}

function runBenchmark(url: string, options: TestConfig): Promise<Result> {
  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url,
      method: options.method as any,
      body: options.body,
      headers: options.headers,
      connections: 10000,
      pipelining: options.pipelining,
      duration: options.duration
    }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

export async function runBenchmarks(servers: ServerConfig[], tests: TestConfig[]): Promise<void> {
  const serverProcesses: { [key: string]: ChildProcess } = {};
  
  try {
    for (const server of servers) {
      serverProcesses[server.name] = await startServer(server);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    for (const test of tests) {
      console.log(`\n=== TEST: ${test.name} ===`);
      
      const testResults: any[] = [];
      
      for (const server of servers) {
        const url = `http://localhost:${server.port}${test.endpoint}`;
        const results = await runBenchmark(url, test);
        
        const requestsPerSecond = Math.floor(results.requests.average);
        const minLatency = results.latency.min.toFixed(2);
        const totalTime = results.duration.toFixed(2);
        
        testResults.push({
          name: server.name,
          requestsPerSecond,
          minLatency,
          totalTime
        });
        
        console.log(`${server.name}: ${requestsPerSecond} req/sec, ${minLatency} ms min latency, ${totalTime} s total time`);
      }
      
      testResults.sort((a, b) => b.requestsPerSecond - a.requestsPerSecond);
      
      console.log('\nRésultats:');
      testResults.forEach((result, index) => {
        console.log(`#${index + 1} ${result.name}: ${result.requestsPerSecond} req/sec, ${result.minLatency} ms min latency, ${result.totalTime} s total time`);
      });
    }
  } finally {
    for (const server of Object.values(serverProcesses)) {
      await stopServer(server);
    }
  }
}
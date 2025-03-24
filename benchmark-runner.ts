import { spawn, ChildProcess } from 'child_process';
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

interface BombardierResult {
  rps: {
    mean: number;
  };
  latency: {
    min: number;
  };
  duration: number;
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

function runBenchmark(url: string, options: TestConfig): Promise<BombardierResult> {
  return new Promise((resolve, reject) => {
    const args = [
      '-m', options.method,
      '-c', options.connections.toString(),
      '-d', `${options.duration}s`,
      '--print', 'r',
      '--format', 'json'
    ];
    
    if (options.body) {
      args.push('-b', options.body);
    }
    
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        args.push('-H', `${key}: ${value}`);
      }
    }
    
    args.push(url);
    
    const bombardier = spawn('bombardier', args);
    let output = '';
    
    bombardier.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    bombardier.stderr.on('data', (data) => {
      console.error(`[bombardier]`, data.toString());
    });
    
    bombardier.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`bombardier exited with code ${code}`));
        return;
      }
      
      try {
        const result = JSON.parse(output);
        const latencyInMs = result.result.latency.mean / 1000;
        
        resolve({
          rps: {
            mean: result.result.rps.mean
          },
          latency: {
            min: latencyInMs
          },
          duration: result.result.timeTakenSeconds
        });
      } catch (err) {
        console.error('Raw output:', output);
        reject(new Error(`Failed to parse bombardier output: ${err}`));
      }
    });
    
    bombardier.on('error', (err) => {
      reject(err);
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
        
        const requestsPerSecond = Math.floor(results.rps.mean);
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


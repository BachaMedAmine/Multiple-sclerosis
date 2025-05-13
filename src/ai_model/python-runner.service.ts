import { Injectable } from '@nestjs/common';
import { spawn, execSync } from 'child_process';
import { join } from 'path';

@Injectable()
export class PythonRunnerService {
private aiModelProcess: any;
private classifierProcess: any;
private regressorProcess: any;

// Helper function to check and kill processes using a specific port
private killProcessOnPort(port: number): void {
try {
const output = execSync(`lsof -i :${port} -t`).toString().trim();
if (output) {
const pids = output.split('\n');
for (const pid of pids) {
console.log(`Killing process ${pid} on port ${port}...`);
execSync(`kill -9 ${pid}`);
}
console.log(`Waiting 10 seconds for port ${port} to be released...`);
execSync('sleep 10');
} else {
console.log(`No process found on port ${port}`);
}
} catch (error) {
console.log(`No process found on port ${port} or error: ${error.message}`);
}
}

// Helper function to check if a process is running
private isProcessRunning(process: any): boolean {
return process && !process.killed && process.pid;
}

startAiModelServer() {
if (this.isProcessRunning(this.aiModelProcess)) {
console.log('AI Model server already running, skipping start.');
return;
}

this.killProcessOnPort(6001);

const projectRoot = join(__dirname, '..', '..');
const scriptPath = join(projectRoot, 'src', 'ai_model', 'server.py');

console.log('Starting AI Model (server.py) on port 6001...');
this.aiModelProcess = spawn('python3', [scriptPath], {
cwd: join(projectRoot, 'src', 'ai_model'),
env: { ...process.env, AI_MODEL_PORT: '6001' } // Explicitly set port
});

this.aiModelProcess.stdout.on('data', (data: Buffer) => {
console.log(`[AI Model] ${data.toString()}`);
});

this.aiModelProcess.stderr.on('data', (data: Buffer) => {
console.error(`[AI Model Error] ${data.toString()}`);
});

this.aiModelProcess.on('close', (code: number) => {
console.log(`[AI Model] Closed with code: ${code}`);
this.aiModelProcess = null;
});
}

startClassifierServer() {
if (this.isProcessRunning(this.classifierProcess)) {
console.log('Classifier server already running, skipping start.');
return;
}

this.killProcessOnPort(6002);

const projectRoot = join(__dirname, '..', '..');
const scriptPath = join(projectRoot, 'src', 'historique', 'ms_relapse_api_Classifier&Regressor', 'classifier_server.py');

console.log('Starting Classifier (classifier_server.py) on port 6002...');
this.classifierProcess = spawn('python3', [scriptPath], {
cwd: join(projectRoot, 'src', 'historique', 'ms_relapse_api_Classifier&Regressor'),
env: { ...process.env, CLASSIFIER_PORT: '6002' } // Explicitly set port
});

this.classifierProcess.stdout.on('data', (data: Buffer) => {
console.log(`[Classifier] ${data.toString()}`);
});

this.classifierProcess.stderr.on('data', (data: Buffer) => {
console.error(`[Classifier Error] ${data.toString()}`);
});

this.classifierProcess.on('close', (code: number) => {
console.log(`[Classifier] Closed with code: ${code}`);
this.classifierProcess = null;
});
}

startRegressorServer() {
if (this.isProcessRunning(this.regressorProcess)) {
console.log('Regressor server already running, skipping start.');
return;
}

this.killProcessOnPort(6003);

const projectRoot = join(__dirname, '..', '..');
const scriptPath = join(projectRoot, 'src', 'historique', 'ms_relapse_api_Classifier&Regressor', 'regressor_server.py');

console.log('Starting Regressor (regressor_server.py) on port 6003...');
this.regressorProcess = spawn('python3', [scriptPath], {
cwd: join(projectRoot, 'src', 'historique', 'ms_relapse_api_Classifier&Regressor'),
env: { ...process.env, REGRESSOR_PORT: '6003' } // Explicitly set port
});

this.regressorProcess.stdout.on('data', (data: Buffer) => {
console.log(`[Regressor] ${data.toString()}`);
});

this.regressorProcess.stderr.on('data', (data: Buffer) => {
console.error(`[Regressor Error] ${data.toString()}`);
});

this.regressorProcess.on('close', (code: number) => {
console.log(`[Regressor] Closed with code: ${code}`);
this.regressorProcess = null;
});
}

stopAllServers() {
if (this.isProcessRunning(this.aiModelProcess)) {
this.aiModelProcess.kill('SIGKILL');
console.log('Stopped AI Model server');
this.aiModelProcess = null;
}
if (this.isProcessRunning(this.classifierProcess)) {
this.classifierProcess.kill('SIGKILL');
console.log('Stopped Classifier server');
this.classifierProcess = null;
}
if (this.isProcessRunning(this.regressorProcess)) {
this.regressorProcess.kill('SIGKILL');
console.log('Stopped Regressor server');
this.regressorProcess = null;
}
console.log('Checking and freeing ports 6001, 6002, 6003...');
this.killProcessOnPort(6001);
this.killProcessOnPort(6002);
this.killProcessOnPort(6003);
}
}


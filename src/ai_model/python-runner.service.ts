import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { join } from 'path';

@Injectable()
export class PythonRunnerService {
  private pythonProcess: any;

  startPythonServer() {
    const projectRoot = join(__dirname, '..', '..');
    const aiModelPath = join(projectRoot, 'src', 'ai_model', 'server.py');

    console.log('Starting AI Python server...');
    console.log(` Using server.py at: ${aiModelPath}`);

    this.pythonProcess = spawn('python3', [aiModelPath], {
      cwd: join(projectRoot, 'src', 'ai_model'), // Working directory
      env: { ...process.env }, // Same environment
    });

    this.pythonProcess.stdout.on('data', (data: Buffer) => {
      console.log(` [Python] ${data.toString()}`);
    });

    this.pythonProcess.stderr.on('data', (data: Buffer) => {
      console.error(` [Python Error] ${data.toString()}`);
    });

    this.pythonProcess.on('close', (code: number) => {
      console.log(` [Python server closed] Exit code: ${code}`);
    });
  }
}
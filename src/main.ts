import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common/pipes';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PythonRunnerService } from './ai_model/python-runner.service';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
const app = await NestFactory.create(AppModule);
const configService = app.get(ConfigService);

app.use('/uploads', express.static(join(__dirname, '..', 'Uploads')));
app.useGlobalPipes(new ValidationPipe());

const config = new DocumentBuilder()
.setTitle('MsAware 2.0')
.setDescription(
'API documentation for BlackMirror : A platform for monitoring and managing healthcare industry professionals and patients'
)
.setVersion('1.0')
.addBearerAuth()
.build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);

const pythonRunnerService = app.get(PythonRunnerService);
pythonRunnerService.startAiModelServer();
pythonRunnerService.startClassifierServer();
pythonRunnerService.startRegressorServer();

process.on('SIGINT', async () => {
console.log('Shutting down NestJS application...');
pythonRunnerService.stopAllServers();
await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
await app.close();
process.exit(0);
});

process.on('SIGTERM', async () => {
console.log('Shutting down NestJS application...');
pythonRunnerService.stopAllServers();
await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
await app.close();
process.exit(0);
});

const port = process.env.PORT ?? 3000;
await app.listen(port, '0.0.0.0');
console.log(`Server is running on http://localhost:${port}`);
console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();


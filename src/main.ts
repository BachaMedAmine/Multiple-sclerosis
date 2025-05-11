import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common/pipes';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PythonRunnerService } from './ai_model/python-runner.service';

async function bootstrap() {
const app = await NestFactory.create(AppModule);

app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
// Enable validation pipes
app.useGlobalPipes(new ValidationPipe());

// Swagger configuration
const config = new DocumentBuilder()
.setTitle('BlackMirror API')
.setDescription('API documentation for BlackMirror : A platform for monitoring and managing healthcare industry professionals and patients')
.setVersion('1.0')
.addBearerAuth()
.build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);

// Start listening on port
await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
console.log(` Server is running on http://localhost:${process.env.PORT ?? 3000}`);
console.log(` Swagger docs available at http://localhost:${process.env.PORT ?? 3000}/api/docs`);

// Start the Python AI Server after NestJS is ready
const pythonRunnerService = app.get(PythonRunnerService);
pythonRunnerService.startPythonServer();
}

bootstrap();


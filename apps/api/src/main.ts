import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // CORS para o frontend
  app.use('/favicon.ico', (_req: any, res: any) => res.status(204).end());
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    credentials: true,
  });

  // Validação global com class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Ronda Online API')
      .setDescription('API do jogo Ronda Online')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env['PORT'] ?? process.env['API_PORT'] ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.warn(`🃏 Ronda API rodando na porta ${port}`);
  if (process.env['NODE_ENV'] !== 'production') {
    console.warn(`📖 Swagger: http://localhost:${port}/docs`);
  }
}

bootstrap();

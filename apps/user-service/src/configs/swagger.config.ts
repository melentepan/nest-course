import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Nest Course API')
    .setDescription(
      'API для регистрации, аутентификации и управления пользователями.',
    )
    .setVersion('1.0')
    .addTag('Authentication', 'Регистрация, вход, обновление токенов и выход')
    .addTag('Profile', 'Данные текущего авторизованного пользователя')
    .addTag('Users', 'Список и управление пользователями')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndAvatars1795175000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const usersExist = await queryRunner.hasTable('users');
    const avatarsExist = await queryRunner.hasTable('user_avatars');
    if (usersExist && avatarsExist) {
      return;
    }
    if (usersExist || avatarsExist) {
      throw new Error(
        'Неполная начальная схема: ожидаются обе таблицы users и user_avatars либо пустая БД',
      );
    }

    await queryRunner.query(`CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      balance numeric(12,2) NOT NULL DEFAULT 0.00,
      username varchar NOT NULL,
      email varchar NOT NULL,
      role varchar NOT NULL DEFAULT 'user',
      password varchar NOT NULL,
      age integer NOT NULL,
      description varchar(1000) NOT NULL,
      hashed_refresh_token varchar,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      deleted_at timestamp,
      CONSTRAINT "CHK_users_balance_valid" CHECK (balance >= 0 AND balance <> 'NaN'::numeric)
    )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9019d29e093cde039ad68e87b2"
      ON users (username) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2a18c8e4339f37c43e4f18f774"
      ON users (email) WHERE deleted_at IS NULL`);

    await queryRunner.query(`CREATE TABLE user_avatars (
      id SERIAL PRIMARY KEY,
      storage_key varchar NOT NULL,
      mime_type varchar NOT NULL,
      size integer NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      deleted_at timestamp,
      user_id integer NOT NULL,
      CONSTRAINT "FK_2681c26ee00a969a6143ab8d38c" FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE NO ACTION ON UPDATE NO ACTION
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_3eec54db2f087bf5efb73a0f34"
      ON user_avatars (user_id) WHERE deleted_at IS NULL`);
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error(
        'Начальная миграция не откатывается автоматически: таблицы могут содержать существующие данные',
      ),
    );
  }
}

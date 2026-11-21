import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransferOutbox1795176000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE transfer_outbox (
      id uuid PRIMARY KEY,
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      published_at timestamptz,
      attempts integer NOT NULL DEFAULT 0,
      next_attempt_at timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE INDEX IDX_transfer_outbox_pending
      ON transfer_outbox (next_attempt_at, created_at) WHERE published_at IS NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE transfer_outbox');
  }
}

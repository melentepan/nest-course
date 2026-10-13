import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from './user.entity';

@Index(['user'], {
  where: '"deleted_at" IS NULL',
})
@Entity('user_avatars')
export class UserAvatar {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.avatars, {
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'storage_key' })
  storageKey: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column()
  size: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}

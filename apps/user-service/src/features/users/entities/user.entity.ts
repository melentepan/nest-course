import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '../../../common/enums/userRole.enum';
import { UserAvatar } from './userAvatar.entity';

@Entity('users')
@Check(
  'CHK_users_balance_valid',
  '"balance" >= 0 AND "balance" <> \'NaN\'::numeric',
)
@Index(['email'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['username'], { unique: true, where: '"deleted_at" IS NULL' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Exclude()
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: '0.00',
    select: false,
  })
  balance: string;

  @Column()
  username: string;

  @Column()
  email: string;

  @Exclude()
  @Column({ type: 'varchar', default: UserRole.USER })
  role: UserRole;

  @Exclude()
  @Column({ select: false })
  password: string;

  @Column()
  age: number;

  @Column({ length: 1000 })
  description: string;

  @Exclude()
  @Column({
    name: 'hashed_refresh_token',
    nullable: true,
    select: false,
    type: 'varchar',
  })
  hashedRefreshToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @OneToMany(() => UserAvatar, (avatar) => avatar.user)
  avatars: UserAvatar[];
}

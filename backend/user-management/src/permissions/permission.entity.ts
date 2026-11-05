import { Role } from 'src/roles/role.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // e.g. 'device.read', 'repairer.update'

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}

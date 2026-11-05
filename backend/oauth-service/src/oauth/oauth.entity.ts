import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('oauth_clients')
export class OauthClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  client_id: string;

  @Column()
  client_secret: string;

  @Column('text', { array: true })
  scopes: string[]; //eg: "devices.read, user.write, user.read, devices.write, devices.delete"

  @Column('text', { array: true, nullable: true })
  redirect_uris: string[]; // Allowed redirect URIs for OAuth2 Authorization Code Flow
}

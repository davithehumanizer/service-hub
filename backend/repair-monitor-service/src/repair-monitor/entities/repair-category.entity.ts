import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { RepairCategoryTranslation } from "./repair-category-translation.entity";
import { RepairCategoryDeviceMapping } from "./repair-category-device-mapping.entity";

@Entity("repair_categories")
export class RepairCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @OneToMany(() => RepairCategoryTranslation, (t) => t.category, {
    cascade: true,
    eager: false,
  })
  translations: RepairCategoryTranslation[];

  @OneToMany(() => RepairCategoryDeviceMapping, (m) => m.repairCategory, {
    cascade: true,
    eager: false,
  })
  deviceMappings: RepairCategoryDeviceMapping[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { RepairCategory } from "./repair-category.entity";

@Entity("repair_category_device_mappings")
export class RepairCategoryDeviceMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RepairCategory, (c) => c.deviceMappings, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "repair_category_id" })
  repairCategory: RepairCategory;

  @Column({ type: "int" })
  deviceCategoryId: number;

  @Column()
  deviceCategoryName: string;
}

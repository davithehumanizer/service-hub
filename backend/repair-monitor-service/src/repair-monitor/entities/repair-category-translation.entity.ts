import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { RepairCategory } from "./repair-category.entity";

@Entity("repair_category_translations")
@Unique(["category", "locale"])
export class RepairCategoryTranslation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RepairCategory, (c) => c.translations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "category_id" })
  category: RepairCategory;

  @Column({ length: 5 })
  locale: string;

  @Column()
  translated_name: string;
}

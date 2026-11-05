import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitDeviceData1742834721973 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        INSERT INTO devices (device_id, ean, serial_number, manufacturer, brand, model, device_type, functional_state, visual_state, age)
        VALUES 
          (1, '1234567890123', 'SN12345', 'Apple', 'Apple', 'iPhone 13', 'Smartphone', 'Functional', 'As New', 24),
          (2, '2345678901234', 'SN23456', 'Samsung', 'Samsung', 'Galaxy S21', 'Smartphone', 'Functional', 'Used', 18),
          (3, '3456789012345', 'SN34567', 'Dell', 'Dell', 'XPS 13', 'Laptop', 'Functional', 'Minor Scratches', 36),
          (4, '4567890123456', 'SN45678', 'Sony', 'Sony', 'PlayStation 5', 'Console', 'Functional', 'Used', 12),
          (5, '5678901234567', 'SN56789', 'Microsoft', 'Microsoft', 'Xbox Series X', 'Console', 'Functional', 'As New', 8),
          (6, '6789012345678', 'SN67890', 'Whirlpool', 'Whirlpool', 'WTX1234', 'Washing Machine', 'Functional', 'Used', 48),
          (7, '7890123456789', 'SN78901', 'Bosch', 'Bosch', 'DishMaster 3000', 'Dishwasher', 'Non-functional', 'Scratched', 60),
          (8, '8901234567890', 'SN89012', 'Dyson', 'Dyson', 'Pure Cool', 'Fan', 'Functional', 'As New', 10),
          (9, '9012345678901', 'SN90123', 'Makita', 'Makita', 'XFD131', 'Drill', 'Functional', 'Used', 24),
          (10, '0123456789012', 'SN01234', 'Kenwood', 'Kenwood', 'Chef XL', 'Food Processor', 'Functional', 'As New', 36),
          (11, '1123456789012', 'SN11234', 'Samsung', 'Samsung', 'Galaxy Tab S7', 'Tablet', 'Functional', 'Used', 12),
          (12, '1223456789012', 'SN12234', 'Fitbit', 'Fitbit', 'Charge 5', 'Smartwatch', 'Functional', 'Minor Scratches', 6),
          (13, '1323456789012', 'SN13234', 'Sony', 'Sony', 'WH-1000XM4', 'Headphones', 'Non-functional', 'Worn', 18),
          (14, '1423456789012', 'SN14234', 'HP', 'HP', 'LaserJet Pro', 'Printer', 'Functional', 'Used', 30),
          (15, '1523456789012', 'SN15234', 'TP-Link', 'TP-Link', 'Archer C7', 'Router', 'Functional', 'As New', 24),
          (16, '1623456789012', 'SN16234', 'Amazon', 'Amazon', 'Echo Dot 4', 'Smart Speaker', 'Functional', 'Used', 9),
          (17, '1723456789012', 'SN17234', 'Canon', 'Canon', 'EOS R6', 'Digital Camera', 'Functional', 'As New', 12),
          (18, '1823456789012', 'SN18234', 'LG', 'LG', 'UltraGear 27GL850', 'Computer Monitor', 'Functional', 'Used', 18),
          (19, '1923456789012', 'SN19234', 'Oral-B', 'Oral-B', 'iO Series 6', 'Electric Toothbrush', 'Non-functional', 'Worn', 24),
          (20, '2023456789012', 'SN20234', 'iRobot', 'iRobot', 'Roomba 980', 'Robot Vacuum', 'Functional', 'Minor Scratches', 36);
      `);

    await queryRunner.query(`
        INSERT INTO device_technical_properties (property_id, "deviceDeviceId", property_name, property_value)
        VALUES 
          (1, 1, 'os', 'iOS 15'),
          (2, 1, 'screen_size', '6.1 inches'),
          (3, 2, 'os', 'Android 11'),
          (4, 2, 'battery_capacity', '4000mAh'),
          (5, 3, 'os', 'Windows 10'),
          (6, 3, 'ram', '16GB'),
          (7, 4, 'gpu', 'AMD RDNA 2'),
          (8, 4, 'storage', '825GB SSD'),
          (9, 5, 'gpu', 'AMD RDNA 2'),
          (10, 5, 'storage', '1TB SSD'),
          (11, 6, 'capacity', '8kg'),
          (12, 6, 'energy_rating', 'A+++'),
          (13, 7, 'capacity', '12 place settings'),
          (14, 7, 'water_usage', '10L per cycle'),
          (15, 8, 'airflow', '350 L/s'),
          (16, 8, 'filter_type', 'HEPA'),
          (17, 9, 'battery', '18V Lithium-Ion'),
          (18, 9, 'torque', '50Nm'),
          (19, 10, 'motor_power', '1200W'),
          (20, 10, 'speed_settings', '6 speeds'),
          (21, 11, 'os', 'Android 11'),
          (22, 11, 'storage', '128GB'),
          (23, 12, 'heart_rate_monitor', 'Yes'),
          (24, 12, 'water_resistance', '5 ATM'),
          (25, 13, 'battery_life', '30 hours'),
          (26, 13, 'noise_cancellation', 'Active'),
          (27, 14, 'print_technology', 'Laser'),
          (28, 14, 'connectivity', 'Wi-Fi/Ethernet'),
          (29, 15, 'wifi_standard', 'Wi-Fi 5'),
          (30, 15, 'ethernet_ports', '4'),
          (31, 16, 'voice_assistant', 'Alexa'),
          (32, 16, 'speaker_power', '15W'),
          (33, 17, 'sensor_type', 'Full-frame CMOS'),
          (34, 17, 'megapixels', '20.1 MP'),
          (35, 18, 'resolution', '2560x1440'),
          (36, 18, 'refresh_rate', '144Hz'),
          (37, 19, 'charging_type', 'Wireless'),
          (38, 19, 'pressure_sensors', '3'),
          (39, 20, 'battery_runtime', '120 min'),
          (40, 20, 'navigation', 'Smart Mapping');
      `);
    // insert categories and link entries
    await queryRunner.query(`
          INSERT INTO device_categories (id, name) VALUES
            (1, 'Personal Computer'),
            (2, 'Gaming Console'),
            (3, 'Home Appliance'),
            (4, 'Power Tool'),
            (5, 'Kitchen Appliance'),
            (6, 'Tablet'),
            (7, 'Wearable'),
            (8, 'Audio'),
            (9, 'Office Equipment'),
            (10, 'Networking'),
            (11, 'Smart Home'),
            (12, 'Imaging'),
            (13, 'Monitor'),
            (14, 'Personal Care'),
            (15, 'Robot Vacuum')
          ON CONFLICT (id) DO NOTHING;

          INSERT INTO device_category_device_link ("devicesDeviceId", "deviceCategoriesId") VALUES
            (1, 1),
            (2, 1),
            (3, 1),
            (4, 2),
            (5, 2),
            (6, 3),
            (7, 3),
            (8, 3),
            (9, 4),
            (10, 5),
            (11, 6),
            (12, 7),
            (13, 8),
            (14, 9),
            (15, 10),
            (16, 11),
            (17, 12),
            (18, 13),
            (19, 14),
            (20, 15)
          ON CONFLICT DO NOTHING;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM device_technical_properties;`);
    await queryRunner.query(`DELETE FROM devices;`);
  }
}

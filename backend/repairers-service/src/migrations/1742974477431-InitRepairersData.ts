import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitRepairerData1742974477431 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          INSERT INTO repairers (name, description, address, city, country, postal_code, website, email, phone, latitude, longitude, source)
          VALUES
            ('TechFix Paris', 'Réparation express de smartphones et tablettes.', '10 Rue de Rivoli', 'Paris', 'France', '75001', 'https://techfix-paris.com', 'contact@techfix-paris.com', '+33123456789', 48.8566, 2.3522, 'migration'),
            ('OrdiRépar Lyon', 'Réparation de PC et Mac.', '25 Boulevard des Brotteaux', 'Lyon', 'France', '69006', 'https://ordirepar-lyon.fr', 'support@ordirepar-lyon.fr', '+33478787878', 45.764, 4.8357, 'migration'),
            ('PhoneFix Toulouse', 'Réparation de téléphones et accessoires.', '12 Rue du Taur', 'Toulouse', 'France', '31000', 'https://phonefix-toulouse.fr', 'info@phonefix-toulouse.fr', '+33531313131', 43.6047, 1.4442, 'migration'),
            ('PC Clinic Bordeaux', 'Réparation de PC et ordinateurs portables.', '18 Cours de l’Intendance', 'Bordeaux', 'France', '33000', 'https://pc-clinic-bordeaux.fr', 'assistance@pc-clinic-bordeaux.fr', '+33556565656', 44.8378, -0.5792, 'migration'),
            ('SmartFix Lille', 'Dépannage et réparation de smartphones et tablettes.', '5 Rue de Béthune', 'Lille', 'France', '59000', 'https://smartfix-lille.fr', 'contact@smartfix-lille.fr', '+33320202020', 50.6292, 3.0573, 'migration'),
            ('Répar Tout Strasbourg', 'Atelier de réparation pour tous types d’appareils.', '45 Grand Rue', 'Strasbourg', 'France', '67000', 'https://repar-tout-strasbourg.fr', 'help@repar-tout-strasbourg.fr', '+33388282828', 48.5734, 7.7521, 'migration'),
            ('Nice Repair', 'Spécialiste en réparation de petits électroménagers.', '22 Avenue Jean Médecin', 'Nice', 'France', '06000', 'https://nice-repair.fr', 'service@nice-repair.fr', '+33493839383', 43.7031, 7.2661, 'migration'),
            ('Montpellier Informatique', 'Réparation et maintenance informatique.', '8 Rue de l’Université', 'Montpellier', 'France', '34000', 'https://montpellier-info.fr', 'contact@montpellier-info.fr', '+33467676767', 43.6119, 3.8772, 'migration'),
            ('Dijon Dépannage', 'Service rapide de réparation d’électronique.', '14 Rue de la Liberté', 'Dijon', 'France', '21000', 'https://dijon-depannage.fr', 'support@dijon-depannage.fr', '+33380505050', 47.322, 5.0415, 'migration'),
            ('Nantes Répar Express', 'Réparation express de smartphones et tablettes.', '19 Rue de Strasbourg', 'Nantes', 'France', '44000', 'https://nantes-repar-express.fr', 'info@nantes-repar-express.fr', '+33240404040', 47.2184, -1.5536, 'migration'),
            ('Grenoble Tech Repair', 'Réparation de matériel informatique.', '7 Place Victor Hugo', 'Grenoble', 'France', '38000', 'https://grenoble-tech-repair.fr', 'tech@grenoble-tech-repair.fr', '+33476767676', 45.1876, 5.7358, 'migration'),
            ('Reims Smart Repair', 'Réparation rapide de téléphones et accessoires.', '3 Boulevard Lundy', 'Reims', 'France', '51100', 'https://reims-smart-repair.fr', 'assistance@reims-smart-repair.fr', '+33326363636', 49.2583, 4.0317, 'migration'),
            ('Toulon Electronics', 'Réparation d’équipements électroniques et multimédia.', '9 Rue d’Alger', 'Toulon', 'France', '83000', 'https://toulon-electronics.fr', 'help@toulon-electronics.fr', '+33494949494', 43.1257, 5.9306, 'migration')
          RETURNING repairer_id;
        `);

    // Associer des appareils aux réparateurs
    await queryRunner.query(`
          INSERT INTO repairer_devices (repairer_id, device_type)
          VALUES
            ((SELECT repairer_id FROM repairers WHERE name='TechFix Paris'), 'smartphone'),
            ((SELECT repairer_id FROM repairers WHERE name='TechFix Paris'), 'tablet'),
            ((SELECT repairer_id FROM repairers WHERE name='OrdiRépar Lyon'), 'laptop'),
            ((SELECT repairer_id FROM repairers WHERE name='PC Clinic Bordeaux'), 'desktop'),
            ((SELECT repairer_id FROM repairers WHERE name='SmartFix Lille'), 'smartwatche'),
            ((SELECT repairer_id FROM repairers WHERE name='Répar Tout Strasbourg'), 'vacuum cleaner'),
            ((SELECT repairer_id FROM repairers WHERE name='Nice Repair'), 'small appliance'),
            ((SELECT repairer_id FROM repairers WHERE name='Montpellier Informatique'), 'printer'),
            ((SELECT repairer_id FROM repairers WHERE name='Dijon Dépannage'), 'laptop'),
            ((SELECT repairer_id FROM repairers WHERE name='Nantes Répar Express'), 'tablet'),
            ((SELECT repairer_id FROM repairers WHERE name='Grenoble Tech Repair'), 'smartphone'),
            ((SELECT repairer_id FROM repairers WHERE name='Reims Smart Repair'), 'charger'),
            ((SELECT repairer_id FROM repairers WHERE name='Toulon Electronics'), 'headphone');
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM repairer_devices WHERE repairer_id IN (SELECT repairer_id FROM repairer);`,
    );
    await queryRunner.query(`DELETE FROM repairer WHERE name IN (
          'TechFix Paris', 'OrdiRépar Lyon', 'PhoneFix Toulouse', 'PC Clinic Bordeaux', 
          'SmartFix Lille', 'Répar Tout Strasbourg', 'Nice Repair', 'Montpellier Informatique', 
          'Dijon Dépannage', 'Nantes Répar Express', 'Grenoble Tech Repair', 
          'Reims Smart Repair', 'Toulon Electronics'
        );`);
  }
}

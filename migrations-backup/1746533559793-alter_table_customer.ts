import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlterTableCustomer1746533559793 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('customer');
    const hasColumn = table?.findColumnByName('cpf');

    if (!hasColumn) {
      await queryRunner.addColumn(
        'customer',
        new TableColumn({
          name: 'cpf',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('customer');
    const hasColumn = table?.findColumnByName('cpf');

    if (hasColumn) {
      await queryRunner.dropColumn('customer', 'cpf');
    }
  }
}

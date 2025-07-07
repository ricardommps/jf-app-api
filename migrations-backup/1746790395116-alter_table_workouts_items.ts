import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlterTableWorkoutsItems1746790395116
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumns('workouts', [
      {
        oldColumn: new TableColumn({
          name: 'description',
          type: 'character varying',
          isNullable: false,
        }),
        newColumn: new TableColumn({
          name: 'description',
          type: 'character varying',
          isNullable: true,
        }),
      },
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumns('workouts', [
      {
        oldColumn: new TableColumn({
          name: 'description',
          type: 'character varying',
          isNullable: true,
        }),
        newColumn: new TableColumn({
          name: 'description',
          type: 'character varying',
          isNullable: false,
        }),
      },
    ]);
  }
}

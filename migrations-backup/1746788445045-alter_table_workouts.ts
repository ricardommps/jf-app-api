import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlterTableWorkouts1746788445045 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumns('workouts', [
      {
        oldColumn: new TableColumn({
          name: 'subtitle',
          type: 'character varying',
          isNullable: false,
        }),
        newColumn: new TableColumn({
          name: 'subtitle',
          type: 'character varying',
          isNullable: true,
        }),
      },
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
      {
        oldColumn: new TableColumn({
          name: 'heating',
          type: 'character varying',
          isNullable: false,
        }),
        newColumn: new TableColumn({
          name: 'heating',
          type: 'character varying',
          isNullable: true,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'recovery',
          type: 'character varying',
          isNullable: false,
        }),
        newColumn: new TableColumn({
          name: 'recovery',
          type: 'character varying',
          isNullable: true,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'published',
          type: 'boolean',
          isNullable: false,
        }),
        newColumn: new TableColumn({
          name: 'published',
          type: 'boolean',
          isNullable: true,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'hide',
          type: 'boolean',
          isNullable: false,
        }),
        newColumn: new TableColumn({
          name: 'hide',
          type: 'boolean',
          isNullable: true,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'finished',
          type: 'boolean',
          isNullable: false,
        }),
        newColumn: new TableColumn({
          name: 'finished',
          type: 'boolean',
          isNullable: true,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'unrealized',
          type: 'boolean',
          isNullable: false,
        }),
        newColumn: new TableColumn({
          name: 'unrealized',
          type: 'boolean',
          isNullable: true,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'running',
          type: 'boolean',
          isNullable: false,
        }),
        newColumn: new TableColumn({
          name: 'running',
          type: 'boolean',
          isNullable: false,
          default: false,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'date_published',
          type: 'timestamp',
          isNullable: false,
        }),
        newColumn: new TableColumn({
          name: 'date_published',
          type: 'timestamp without time zone',
          isNullable: true,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'workout_date_other',
          type: 'timestamp',
          isNullable: false,
        }),
        newColumn: new TableColumn({
          name: 'workout_date_other',
          type: 'timestamp without time zone',
          isNullable: true,
        }),
      },
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumns('workouts', [
      {
        oldColumn: new TableColumn({
          name: 'subtitle',
          type: 'character varying',
          isNullable: true,
        }),
        newColumn: new TableColumn({
          name: 'subtitle',
          type: 'character varying',
          isNullable: false,
        }),
      },
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
      {
        oldColumn: new TableColumn({
          name: 'heating',
          type: 'character varying',
          isNullable: true,
        }),
        newColumn: new TableColumn({
          name: 'heating',
          type: 'character varying',
          isNullable: false,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'recovery',
          type: 'character varying',
          isNullable: true,
        }),
        newColumn: new TableColumn({
          name: 'recovery',
          type: 'character varying',
          isNullable: false,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'published',
          type: 'boolean',
          isNullable: true,
        }),
        newColumn: new TableColumn({
          name: 'published',
          type: 'boolean',
          isNullable: false,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'hide',
          type: 'boolean',
          isNullable: true,
        }),
        newColumn: new TableColumn({
          name: 'hide',
          type: 'boolean',
          isNullable: false,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'finished',
          type: 'boolean',
          isNullable: true,
        }),
        newColumn: new TableColumn({
          name: 'finished',
          type: 'boolean',
          isNullable: false,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'unrealized',
          type: 'boolean',
          isNullable: true,
        }),
        newColumn: new TableColumn({
          name: 'unrealized',
          type: 'boolean',
          isNullable: false,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'running',
          type: 'boolean',
          isNullable: false,
          default: 'false',
        }),
        newColumn: new TableColumn({
          name: 'running',
          type: 'boolean',
          isNullable: false,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'date_published',
          type: 'timestamp without time zone',
          isNullable: true,
        }),
        newColumn: new TableColumn({
          name: 'date_published',
          type: 'timestamp',
          isNullable: false,
        }),
      },
      {
        oldColumn: new TableColumn({
          name: 'workout_date_other',
          type: 'timestamp without time zone',
          isNullable: true,
        }),
        newColumn: new TableColumn({
          name: 'workout_date_other',
          type: 'timestamp',
          isNullable: false,
        }),
      },
    ]);
  }
}

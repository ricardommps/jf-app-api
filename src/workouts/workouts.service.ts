import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProgramEntity } from 'src/entities/program.entity';
import { MusclesWorkedService } from 'src/muscles-worked/muscles-worked.service';
import { Between, In, Repository } from 'typeorm';
import { MediaEntity } from '../entities/media.entity';
import { MediaInfoEntity } from '../entities/mediaInfo.entity';
import { WorkoutItemMediaEntity } from '../entities/workoutItemMedia.entity';
import { WorkoutItemEntity } from '../entities/workoutItens.entity';
import { WorkoutsEntity } from '../entities/workouts.entity';

export interface WorkoutWithGroupedMedias {
  id: string;
  programId: number;
  title: string;
  subtitle?: string;
  published: boolean;
  hide: boolean;
  finished: boolean;
  running: boolean;
  workoutItems: Array<{
    id: string;
    workout: any;
    category: string;
    description: string;
    mediaOrder: any[];
    mediaInfo: any[];
    medias: MediaEntity[][]; // Array de grupos de mídias
    isWorkoutLoad: boolean;
  }>;
}

@Injectable()
export class WorkoutsService {
  constructor(
    @InjectRepository(WorkoutsEntity)
    private workoutRepository: Repository<WorkoutsEntity>,

    private readonly musclesWorkedService: MusclesWorkedService,

    @InjectRepository(WorkoutItemEntity)
    private readonly workoutItemRepository: Repository<WorkoutItemEntity>,

    @InjectRepository(MediaEntity)
    private readonly mediaRepository: Repository<MediaEntity>,

    @InjectRepository(WorkoutItemMediaEntity) // Injetar o repositório da tabela de junção
    private readonly workoutItemMediaRepository: Repository<WorkoutItemMediaEntity>,

    @InjectRepository(MediaInfoEntity) // Injetar o repositório da tabela de junção
    private readonly mediaInfoRepository: Repository<MediaInfoEntity>,

    @InjectRepository(ProgramEntity)
    private programRepository: Repository<ProgramEntity>,
  ) {}

  async createWorkout(workout): Promise<WorkoutWithGroupedMedias> {
    try {
      const { workoutItems = [], ...rest } = workout;

      const normalizeNumeric = (value: any) =>
        value === '' || value === undefined ? null : value;

      const normalizedWorkout = {
        ...rest,
        distance: normalizeNumeric(rest.distance),
        heating: normalizeNumeric(rest.heating),
        recovery: normalizeNumeric(rest.recovery),
      };

      // Salva o treino já normalizado
      const savedWorkout = await this.workoutRepository.save(normalizedWorkout);

      for (const item of workoutItems) {
        const processedMediaOrder = this.processMediaStructure(
          item.medias || [],
          item.mediaOrder || [],
        );

        const workoutItem = await this.workoutItemRepository.save({
          workout: savedWorkout,
          _id: item._id,
          category: item.category,
          description: item.description || '',
          mediaOrder: processedMediaOrder,
          isWorkoutLoad: item.isWorkoutLoad || '',
        });

        if (!workoutItem?.id) {
          throw new Error('Falha ao salvar workoutItem ou ID não gerado.');
        }

        if (Array.isArray(item.medias) && item.medias.length > 0) {
          await this.processWorkoutItemMedias(workoutItem, item.medias);
        }

        if (Array.isArray(item.mediaInfo) && item.mediaInfo.length > 0) {
          await this.processMediaInfo(workoutItem, item.mediaInfo);
        }
      }

      return await this.getWorkoutWithRelations(savedWorkout.id, workoutItems);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async createRunningRaces(workout): Promise<WorkoutWithGroupedMedias> {
    const { workoutItems = [], ...rest } = workout;

    if (workout.title !== 'COMPETICAO') {
      throw new Error('Erro ao salva prova.');
    }

    // Salva o treino
    const savedWorkout = await this.workoutRepository.save(rest);

    for (const item of workoutItems) {
      const processedMediaOrder = this.processMediaStructure(
        item.medias || [],
        item.mediaOrder || [],
      );

      const workoutItem = await this.workoutItemRepository.save({
        workout: savedWorkout,
        _id: item._id,
        category: item.category,
        description: item.description || '',
        mediaOrder: processedMediaOrder,
        isWorkoutLoad: item.isWorkoutLoad || '',
      });

      if (!workoutItem?.id) {
        throw new Error('Falha ao salvar workoutItem ou ID não gerado.');
      }
      if (Array.isArray(item.medias) && item.medias.length > 0) {
        await this.processWorkoutItemMedias(workoutItem, item.medias || []);
      }

      if (Array.isArray(item.mediaInfo) && item.mediaInfo.length > 0) {
        await this.processMediaInfo(workoutItem, item.mediaInfo);
      }
    }
    return await this.getWorkoutWithRelations(savedWorkout.id, workoutItems);
  }

  async cloneWorkout(id: string, qntCopy: number) {
    try {
      const workout = await this.workoutRepository.findOne({
        where: { id: id },
        relations: [
          'workoutItems',
          'workoutItems.medias',
          'workoutItems.mediaInfo',
        ],
      });

      if (!workout) {
        throw new Error('Workout não encontrado');
      }

      delete workout.id;
      workout.datePublished = null;
      workout.workoutDateOther = null;
      workout.published = false;
      workout.finished = false;
      workout.unrealized = false;

      if (workout.workoutItems) {
        workout.workoutItems.forEach((item) => {
          delete item.id;
          delete item.workout;
          if (item.medias) {
            item.medias.forEach((media) => {
              delete media.workoutItems;
            });
          }

          if (item.mediaInfo) {
            item.mediaInfo.forEach((info) => {
              delete info.id;
              delete info.workoutItem;
              delete info.media;
            });
          }
        });
      }
      const promises = [];
      for (let i = 0; i < qntCopy; i++) {
        const workoutCopy = JSON.parse(JSON.stringify(workout));
        promises.push(this.createWorkout(workoutCopy));
      }
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.log(error);
      throw new Error(`Error cloning workout: ${error.message}`);
    }
  }

  async sendWorkout(workoutId: string, programIds: string[]) {
    try {
      const workout = await this.workoutRepository.findOne({
        where: { id: workoutId },
        relations: [
          'workoutItems',
          'workoutItems.medias',
          'workoutItems.mediaInfo',
        ],
      });
      if (!workout) {
        throw new Error('Workout não encontrado');
      }
      const programs = await this.programRepository.find({
        where: { id: In(programIds) },
      });
      if (programs.length !== programIds.length) {
        throw new Error('Um ou mais programas não foram encontrados');
      }
      const workoutBase = { ...workout };
      delete workoutBase.id;
      workoutBase.datePublished = null;
      workoutBase.workoutDateOther = null;
      workoutBase.published = false;
      workoutBase.finished = false;
      workoutBase.unrealized = false;
      if (workoutBase.workoutItems) {
        workoutBase.workoutItems.forEach((item) => {
          delete item.id;
          delete item.workout;
          if (item.medias) {
            item.medias.forEach((media) => {
              delete media.workoutItems;
            });
          }
          if (item.mediaInfo) {
            item.mediaInfo.forEach((info) => {
              delete info.id;
              delete info.workoutItem;
              delete info.media;
            });
          }
        });
      }

      const promises = programIds.map((programId) => {
        const workoutCopy = JSON.parse(JSON.stringify(workoutBase));
        workoutCopy.programId = programId;
        return this.createWorkout(workoutCopy);
      });

      const results = await Promise.all(promises);

      return results;
    } catch (error) {
      throw new Error(`Error sending workout: ${error.message}`);
    }
  }

  async deleteWorkout(id: string) {
    const existingWorkout = await this.workoutRepository.findOne({
      where: { id },
    });
    return await this.workoutRepository.remove(existingWorkout);
  }

  async updateWorkout(
    workoutId: string,
    workout,
  ): Promise<WorkoutWithGroupedMedias> {
    try {
      const { workoutItems = [], ...rest } = workout;

      // Busca o workout existente
      const existingWorkout = await this.workoutRepository.findOne({
        where: { id: workoutId },
        relations: [
          'workoutItems',
          'workoutItems.medias',
          'workoutItems.mediaInfo',
        ],
      });

      if (!existingWorkout) {
        throw new Error('Workout não encontrado.');
      }

      // Sanitiza os dados antes de atualizar (converte strings vazias em null para campos numéricos)
      const sanitizedData = this.sanitizeWorkoutData(rest);

      // Atualiza os dados principais do workout
      await this.workoutRepository.update(workoutId, sanitizedData);

      // ... resto do código permanece igual

      // Busca workoutItems existentes
      const existingWorkoutItems = existingWorkout.workoutItems || [];

      // Mapeia os IDs dos workoutItems que devem permanecer
      const incomingItemIds = workoutItems
        .filter((item) => item._id)
        .map((item) => item._id);

      // Remove workoutItems que não estão mais na lista
      const itemsToRemove = existingWorkoutItems.filter(
        (item) => !incomingItemIds.includes(item._id),
      );

      for (const itemToRemove of itemsToRemove) {
        // Remove relacionamentos com medias
        await this.workoutItemMediaRepository.delete({
          workoutItemId: itemToRemove.id,
        });

        // Remove mediaInfo relacionadas
        await this.mediaInfoRepository.delete({
          workoutItem: { id: itemToRemove.id },
        });

        // Remove o workoutItem
        await this.workoutItemRepository.delete(itemToRemove.id);
      }

      // Processa cada workoutItem da requisição
      for (const item of workoutItems) {
        const processedMediaOrder = this.processMediaStructure(
          item.medias || [],
          item.mediaOrder || [],
        );

        let workoutItem;

        if (item._id) {
          // Atualiza workoutItem existente
          const existingItem = existingWorkoutItems.find(
            (ei) => ei._id === item._id,
          );

          if (existingItem) {
            await this.workoutItemRepository.update(existingItem.id, {
              category: item.category,
              description: item.description || '',
              mediaOrder: processedMediaOrder,
              isWorkoutLoad: item.isWorkoutLoad,
            });

            workoutItem = await this.workoutItemRepository.findOne({
              where: { id: existingItem.id },
            });

            // Remove relacionamentos antigos de media
            await this.workoutItemMediaRepository.delete({
              workoutItemId: workoutItem.id,
            });

            // Remove mediaInfo antigas
            await this.mediaInfoRepository.delete({
              workoutItem: { id: workoutItem.id },
            });
          } else {
            // Cria novo workoutItem (caso o _id não seja encontrado)
            workoutItem = await this.workoutItemRepository.save({
              workout: existingWorkout,
              _id: item._id,
              category: item.category,
              description: item.description || '',
              mediaOrder: processedMediaOrder,
              isWorkoutLoad: item.isWorkoutLoad, // CORRIGIDO: estava usando description
            });
          }
        } else {
          // Cria novo workoutItem (sem _id)
          workoutItem = await this.workoutItemRepository.save({
            workout: existingWorkout,
            _id: item._id,
            category: item.category,
            description: item.description || '',
            mediaOrder: processedMediaOrder,
            isWorkoutLoad: item.isWorkoutLoad, // CORRIGIDO: estava usando description
          });
        }

        if (!workoutItem?.id) {
          throw new Error(
            'Falha ao salvar/atualizar workoutItem ou ID não gerado.',
          );
        }

        // Processa as medias do workoutItem
        await this.processWorkoutItemMedias(workoutItem, item.medias || []);

        // Processa mediaInfo se existir
        if (Array.isArray(item.mediaInfo) && item.mediaInfo.length > 0) {
          await this.processMediaInfo(workoutItem, item.mediaInfo);
        }
      }

      return await this.getWorkoutWithRelations(workoutId, workoutItems);
    } catch (err) {
      console.log(err);
      throw err; // É importante re-lançar o erro
    }
  }

  // Adicione este método auxiliar na classe
  private sanitizeWorkoutData(data: any): any {
    const sanitized = { ...data };

    // Lista de campos numéricos que podem vir como string vazia
    const numericFields = ['distance', 'displayOrder', 'programId'];

    numericFields.forEach((field) => {
      if (
        sanitized[field] === '' ||
        sanitized[field] === null ||
        sanitized[field] === undefined
      ) {
        sanitized[field] = null;
      }
    });

    return sanitized;
  }

  private processMediaStructure(medias: any[], mediaOrder: any[] = []): any[] {
    if (mediaOrder && mediaOrder.length > 0) {
      return mediaOrder.map((item) => {
        if (Array.isArray(item)) {
          return item.map(String);
        }
        return String(item);
      });
    }

    if (!medias || medias.length === 0) {
      return [];
    }

    if (
      medias.every(
        (group) =>
          Array.isArray(group) &&
          group.every((item) => typeof item === 'object' && item.id),
      )
    ) {
      return medias.map((group) => group.map((media) => String(media.id)));
    }

    return medias.map((item) => {
      if (Array.isArray(item)) {
        return item.map(String);
      }
      return String(item);
    });
  }

  private async processWorkoutItemMedias(
    workoutItem: any,
    medias: any[],
  ): Promise<void> {
    if (!medias || medias.length === 0) {
      return;
    }
    const allMediaIds = new Set<number>();

    for (const item of medias) {
      if (Array.isArray(item)) {
        if (item.every((media) => typeof media === 'object' && media.id)) {
          item.forEach((media) => allMediaIds.add(Number(media.id)));
        } else {
          item.forEach((id) => allMediaIds.add(Number(id)));
        }
      } else if (typeof item === 'object' && item.id) {
        allMediaIds.add(Number(item.id));
      } else {
        allMediaIds.add(Number(item));
      }
    }

    const mediaEntities = await this.mediaRepository.find({
      where: { id: In(Array.from(allMediaIds)) },
    });

    const workoutItemMedias = mediaEntities.map((media) => ({
      workoutItemId: workoutItem.id,
      mediaId: media.id.toString(),
    }));

    if (workoutItemMedias.length > 0) {
      await this.workoutItemMediaRepository.save(workoutItemMedias);
    }
  }

  private async processMediaInfo(
    workoutItem: any,
    mediaInfo: any[],
  ): Promise<void> {
    for (const infoEntry of mediaInfo) {
      if (!infoEntry.mediaId) {
        throw new Error('mediaId é necessário para cada entrada de mediaInfo.');
      }

      const mediaInfo = {
        workoutItem: workoutItem,
        media: { id: infoEntry.mediaId },
        method: infoEntry.method || null,
        reps: infoEntry.reps || null,
        reset: infoEntry.reset || null,
        rir: infoEntry.rir || null,
        cadence: infoEntry.cadence || null,
        comments: infoEntry.comments || null,
      };

      await this.mediaInfoRepository.save(mediaInfo);
    }
  }

  private async getWorkoutWithRelations(
    workoutId: any,
    originalWorkoutItems: any[],
  ): Promise<WorkoutWithGroupedMedias> {
    const workoutWithRelations = await this.workoutRepository.findOne({
      where: { id: workoutId },
      relations: ['workoutItems', 'workoutItems.medias'],
    });
    const customWorkoutItems = workoutWithRelations.workoutItems.map((item) => {
      const originalItem = originalWorkoutItems.find(
        (i) => i.category === item.category,
      );

      if (!originalItem || !originalItem.medias) {
        return {
          id: item.id,
          workout: item.workout,
          category: item.category,
          description: item.description,
          mediaOrder: item.mediaOrder || [],
          mediaInfo: item.mediaInfo || [],
          medias: [] as MediaEntity[][],
          isWorkoutLoad: item.isWorkoutLoad,
        };
      }
      const groupedMedias = this.reconstructMediaGroups(
        originalItem.medias,
        item.medias,
      );

      return {
        id: item.id,
        workout: item.workout,
        category: item.category,
        description: item.description,
        mediaOrder: item.mediaOrder || [],
        mediaInfo: item.mediaInfo || [],
        medias: groupedMedias,
        isWorkoutLoad: item.isWorkoutLoad,
      };
    });

    return {
      id: workoutWithRelations.id,
      programId: workoutWithRelations.programId,
      title: workoutWithRelations.title,
      subtitle: workoutWithRelations.subtitle,
      published: workoutWithRelations.published,
      hide: workoutWithRelations.hide,
      finished: workoutWithRelations.finished,
      running: workoutWithRelations.running,
      workoutItems: customWorkoutItems,
    };
  }

  private reconstructMediaGroups(
    originalMedias: any[],
    itemMedias: MediaEntity[],
  ): MediaEntity[][] {
    return originalMedias
      .map((group: any) => {
        if (Array.isArray(group)) {
          // Se é um array de objetos (estrutura original)
          if (group.every((media) => typeof media === 'object' && media.id)) {
            const groupIds = group.map((media) => String(media.id));
            return itemMedias.filter((m) => groupIds.includes(String(m.id)));
          }
          // Se é um array de strings/números (nova estrutura)
          else {
            const groupIds = group.map(String);
            return itemMedias.filter((m) => groupIds.includes(String(m.id)));
          }
        } else if (typeof group === 'object' && group.id) {
          // Objeto de mídia individual (estrutura original)
          return itemMedias.filter((m) => String(m.id) === String(group.id));
        } else {
          // String/número individual (nova estrutura)
          return itemMedias.filter((m) => String(m.id) === String(group));
        }
      })
      .filter((group) => group.length > 0); // Remove grupos vazios
  }

  async getWorkoutsByProgramId(
    programId: number,
    running: boolean,
  ): Promise<WorkoutsEntity[]> {
    try {
      const workouts = await this.workoutRepository.find({
        where: {
          programId,
          running,
        },
        relations: ['workoutItems', 'workoutItems.medias', 'history'],
        order: { createdAt: 'DESC' },
      });
      return workouts;
    } catch (error) {
      throw new Error(error);
    }
  }

  async getWorkoutsByProgramIdSimple_old(
    programId: number,
    running: boolean,
  ): Promise<WorkoutsEntity[]> {
    try {
      return await this.workoutRepository
        .createQueryBuilder('workout')
        .leftJoinAndSelect('workout.workoutItems', 'workoutItems')
        .leftJoinAndSelect('workoutItems.medias', 'medias')
        .leftJoinAndSelect('workout.history', 'finished')
        .where('workout.programId = :programId', { programId })
        .andWhere('workout.running = :running', { running })
        .orderBy('workout.displayOrder', 'ASC')
        .getMany();
    } catch (error) {
      throw new Error(`Failed to get workouts: ${error.message}`);
    }
  }

  // async getWorkoutsByProgramIdSimple(
  //   programId: number,
  //   running: boolean,
  //   published?: boolean,
  // ): Promise<WorkoutsEntity[]> {
  //   try {
  //     const query = this.workoutRepository
  //       .createQueryBuilder('workout')
  //       .leftJoinAndSelect('workout.workoutItems', 'workoutItems')
  //       .leftJoinAndSelect('workoutItems.medias', 'medias')
  //       .leftJoinAndSelect('workout.history', 'finished')
  //       .where('workout.programId = :programId', { programId })
  //       .andWhere('workout.running = :running', { running });

  //     // Aplica filtro de published se fornecido
  //     if (published !== undefined) {
  //       query.andWhere('workout.published = :published', { published });
  //     }

  //     // 👉 Se running = true, filtra somente o ano atual
  //     if (running) {
  //       const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  //       const endOfYear = new Date(new Date().getFullYear() + 1, 0, 1);

  //       query.andWhere(
  //         'workout.datePublished >= :startOfYear AND workout.datePublished < :endOfYear',
  //         { startOfYear, endOfYear },
  //       );

  //       query.orderBy('workout.datePublished', 'DESC');
  //     } else {
  //       query.orderBy('workout.displayOrder', 'ASC');
  //     }

  //     return await query.getMany();
  //   } catch (error) {
  //     throw new Error(`Failed to get workouts: ${error.message}`);
  //   }
  // }

  async getWorkoutsByProgramIdSimple(
    programId: number,
    running: boolean,
    published?: boolean,
  ): Promise<WorkoutsEntity[]> {
    const query = this.workoutRepository
      .createQueryBuilder('workout')
      .leftJoinAndSelect('workout.workoutItems', 'workoutItems')
      .leftJoinAndSelect('workoutItems.medias', 'medias')
      .leftJoinAndSelect('workout.history', 'finished')
      .where('workout.programId = :programId', { programId })
      .andWhere('workout.running = :running', { running });

    if (published !== undefined) {
      query.andWhere('workout.published = :published', { published });
    }

    if (running) {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const endOfYear = new Date(new Date().getFullYear() + 1, 0, 1);

      query.andWhere(
        'workout.datePublished >= :startOfYear AND workout.datePublished < :endOfYear',
        { startOfYear, endOfYear },
      );

      query.orderBy('workout.datePublished', 'DESC');
    } else {
      query.orderBy('workout.displayOrder', 'ASC');
    }

    const workouts = await query.getMany();

    // 🔴 running = true → não injeta musclesWorked
    if (running) {
      return workouts;
    }

    /**
     * ============================
     * NÃO RUNNING
     * ============================
     */

    // 1️⃣ Normaliza workoutItems (mediaOrder → MediaEntity[][])
    workouts.forEach((workout) => {
      workout.workoutItems = transformWorkoutItems(workout.workoutItems);
    });

    // 2️⃣ Extrai mediaIds (number, compatível com MusclesWorkedService)
    const mediaIds = workouts
      .flatMap((workout) => workout.workoutItems)
      .flatMap((item) => item.medias)
      .flatMap((group) => group)
      .map((media) => Number(media.id))
      .filter((id) => !isNaN(id));

    const uniqueMediaIds: number[] = [...new Set(mediaIds)];

    if (!uniqueMediaIds.length) {
      return workouts;
    }
    // 3️⃣ Busca musclesWorked
    const musclesWorkedList =
      await this.musclesWorkedService.findByMediaIds(uniqueMediaIds);
    const musclesWorkedMap = new Map(
      musclesWorkedList.map((mw) => [mw.mediaId, mw]),
    );
    // 4️⃣ Injeta musclesWorked nas medias
    workouts.forEach((workout) => {
      workout.workoutItems.forEach((item) => {
        item.medias = item.medias.map((group: any) => {
          const newGroup: any = {};

          Object.keys(group).forEach((key) => {
            // ignora chaves não numéricas
            if (isNaN(Number(key))) return;

            const media = group[key];
            const mediaId = Number(media.id);

            newGroup[key] = {
              ...media,
              musclesWorked: musclesWorkedMap.get(mediaId) ?? null,
            };
          });

          return newGroup;
        });
      });
    });

    return workouts;
  }
  async getWorkoutsByProgramIdSimpleAdmin(
    programId: number,
    running: boolean,
    published?: boolean,
  ): Promise<WorkoutsEntity[]> {
    try {
      const query = this.workoutRepository
        .createQueryBuilder('workout')
        .leftJoinAndSelect('workout.workoutItems', 'workoutItems')
        .leftJoinAndSelect('workoutItems.medias', 'medias')
        .leftJoinAndSelect('workout.history', 'finished')
        .where('workout.programId = :programId', { programId })
        .andWhere('workout.running = :running', { running });

      if (published !== undefined) {
        query.andWhere('workout.published = :published', { published });
      }

      if (running) {
        const today = new Date();

        const twelveMonthsAgo = new Date(today);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        query.andWhere(
          '(workout.datePublished >= :twelveMonthsAgo OR workout.datePublished IS NULL)',
          { twelveMonthsAgo },
        );

        query.orderBy('workout.datePublished', 'DESC');
      } else {
        query.orderBy('workout.displayOrder', 'ASC');
      }

      return await query.getMany();
    } catch (error) {
      throw new Error(`Failed to get workouts: ${error.message}`);
    }
  }

  async getWorkoutRunningRaces(programId: number): Promise<WorkoutsEntity[]> {
    try {
      const currentYear = new Date().getFullYear();

      const startOfYear = new Date(currentYear, 0, 1, 0, 0, 0);
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

      const workouts = await this.workoutRepository.find({
        where: {
          programId,
          title: 'COMPETICAO',
          datePublished: Between(startOfYear, endOfYear),
        },
        order: { datePublished: 'DESC' },
      });

      return workouts;
    } catch (error) {
      throw error;
    }
  }

  // async getWorkoutById(id: string): Promise<WorkoutsEntity> {
  //   try {
  //     const workout = await this.workoutRepository.findOne({
  //       where: { id },
  //       relations: [
  //         'workoutItems',
  //         'workoutItems.medias',
  //         'workoutItems.mediaInfo',
  //       ],
  //     });

  //     if (!workout) {
  //       throw new Error('Workout não encontrado');
  //     }

  //     // Evita conflito renomeando aqui
  //     const items = workout.workoutItems;

  //     // Atualiza workoutItems com o retorno da transformação
  //     workout.workoutItems = transformWorkoutItems(items);

  //     return workout;
  //   } catch (error) {
  //     throw new Error(error);
  //   }
  // }

  async getWorkoutById(id: string): Promise<WorkoutsEntity> {
    const workout = await this.workoutRepository.findOne({
      where: { id },
      relations: [
        'workoutItems',
        'workoutItems.medias',
        'workoutItems.mediaInfo',
      ],
    });

    if (!workout) {
      throw new Error('Workout não encontrado');
    }

    const items = transformWorkoutItems(workout.workoutItems);

    /**
     * 1. Extrai todos os mediaIds
     */
    const mediaIds = items
      .flatMap((item) => item.medias)
      .flatMap((mediaGroup) => mediaGroup)
      .map((media) => media.id);

    const uniqueMediaIds = [...new Set(mediaIds)];

    /**
     * 2. Busca muscles_worked em lote
     */
    const musclesWorkedList =
      await this.musclesWorkedService.findByMediaIds(uniqueMediaIds);

    const musclesWorkedMap = new Map(
      musclesWorkedList.map((mw) => [mw.mediaId, mw]),
    );

    /**
     * 3. Injeta musclesWorked em cada media
     */
    items.forEach((item) => {
      item.medias = item.medias.map((mediaGroup) =>
        mediaGroup.map((media) => ({
          ...media,
          musclesWorked: musclesWorkedMap.get(media.id) ?? null,
        })),
      );
    });

    workout.workoutItems = items;

    return workout;
  }
}
function transformWorkoutItems(items: any[]) {
  return items
    .sort((a, b) => a._id - b._id) // Ordena pelo _id
    .map((item) => {
      const mediasMap = new Map(
        (item.medias || []).map((m) => [m.id.toString(), m]),
      );

      const mediasNested = (item.mediaOrder || []).map((id: any) => {
        if (Array.isArray(id)) {
          return id.map((subId) => mediasMap.get(subId));
        } else {
          return [mediasMap.get(id)];
        }
      });

      return {
        ...item,
        medias: mediasNested,
      };
    });
}

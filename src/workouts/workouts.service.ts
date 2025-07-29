import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProgramEntity } from 'src/entities/program.entity';
import { In, Repository } from 'typeorm';
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
    const { workoutItems = [], ...rest } = workout;

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

    // Atualiza os dados principais do workout
    await this.workoutRepository.update(workoutId, rest);

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
            isWorkoutLoad: item.description || '',
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
          isWorkoutLoad: item.description || '',
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

  async getWorkoutsByProgramIdSimple(
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

      // Aplica filtro de published se fornecido
      if (published !== undefined) {
        query.andWhere('workout.published = :published', { published });
      }

      // Aplica a ordenação condicional
      if (running) {
        query.orderBy('workout.datePublished', 'DESC');
      } else {
        query.orderBy('workout.displayOrder', 'ASC');
      }

      return await query.getMany();
    } catch (error) {
      throw new Error(`Failed to get workouts: ${error.message}`);
    }
  }

  async getWorkoutById(id: string): Promise<WorkoutsEntity> {
    try {
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

      // Evita conflito renomeando aqui
      const items = workout.workoutItems;

      // Atualiza workoutItems com o retorno da transformação
      workout.workoutItems = transformWorkoutItems(items);

      return workout;
    } catch (error) {
      throw new Error(error);
    }
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

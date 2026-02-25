import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCommentDto } from 'src/dtos/create-comment.dto';
import { CommentEntity } from 'src/entities/comment.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { NotificationService } from 'src/notification/notification.service';
import { In, Repository } from 'typeorm';
import { FinishedEntity } from '../entities/finished.entity';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(CommentEntity)
    private commentRepository: Repository<CommentEntity>,

    @InjectRepository(FinishedEntity)
    private finishedRepository: Repository<FinishedEntity>,

    private readonly firebaseService: FirebaseService,
    private readonly notificationService: NotificationService,
  ) {}

  async createFinishedCommnet(createCommentDto: CreateCommentDto) {
    const { finishedId, content, authorUserId, parentId } = createCommentDto;
    const finished = await this.finishedRepository.findOne({
      where: { id: finishedId },
      relations: ['workout', 'workouts'],
    });
    if (!finished) {
      throw new HttpException(
        'Treino finalizado não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const comment = await this.commentRepository.create({
      finishedId,
      authorId: authorUserId,
      content,
      isAdmin: false,
      parentId: parentId || null,
      read: false, // Novo comentário sempre começa como não lido
    });
    await this.commentRepository.save(comment);
    return comment;
  }

  async createComment(
    loggedUserId: number,
    createCommentDto: CreateCommentDto,
    isAdmin: boolean,
  ): Promise<CommentEntity> {
    const { finishedId, content, authorUserId, parentId } = createCommentDto;
    const authorId = isAdmin && authorUserId ? authorUserId : loggedUserId;
    if (!isAdmin && authorUserId) {
      throw new HttpException(
        'Apenas administradores podem informar outro usuário',
        HttpStatus.FORBIDDEN,
      );
    }

    // 🔎 Verificar se o finished existe
    const finished = await this.finishedRepository.findOne({
      where: { id: finishedId },
      relations: ['workout', 'workouts'],
    });
    if (!finished) {
      throw new HttpException(
        'Treino finalizado não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // 🔐 Verificação de acesso
    // - admin: valida acesso do usuário alvo
    // - user comum: valida acesso do próprio usuário logado
    const accessUserId = isAdmin ? authorId : loggedUserId;
    const hasAccess = await this.checkUserAccess(accessUserId, finishedId);
    if (!isAdmin && !hasAccess) {
      throw new HttpException(
        'Usuário não tem permissão para comentar neste treino',
        HttpStatus.FORBIDDEN,
      );
    }

    // 🔗 Se parentId foi fornecido, verificar se o comentário pai existe e pertence ao mesmo treino
    if (parentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: parentId },
      });

      if (!parentComment) {
        throw new HttpException(
          'Comentário pai não encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      if (parentComment.finishedId !== finishedId) {
        throw new HttpException(
          'O comentário pai pertence a outro treino',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // 📝 Criar o comentário
    const comment = await this.commentRepository.create({
      finishedId,
      authorId,
      content,
      isAdmin,
      parentId: parentId || null,
      read: false, // Novo comentário sempre começa como não lido
    });
    const savedComment = await this.commentRepository.save(comment);
    if (isAdmin && parentId && authorUserId) {
      const payloadNotification = {
        recipientId: authorId,
        title: 'Olá',
        content: 'Joana respondeu um comentário seu! Vem ver!',
        type: 'feedback',
        link: finishedId,
      };

      const notification =
        await this.notificationService.createNotification(payloadNotification);

      const message = {
        title: payloadNotification.title,
        body: payloadNotification.content,
        data: {
          url: `jfapp://feedback?feedbackId=${finishedId}&notificationId=${notification.id}`,
          screen: 'feedback',
          params: `{\"feedbackId\":\"${finishedId}\",\"notificationId\":\"${notification.id}\",\"source\":\"push\"}`,
        },
      };

      await this.firebaseService.sendNotificationNew(
        String(authorUserId),
        message,
      );
    }

    return savedComment;
  }

  async getCommentsByFinished(
    userId: number,
    finishedId: number,
    isAdmin: boolean,
  ): Promise<any[]> {
    // Verificar se o finished existe
    const finished = await this.finishedRepository.findOne({
      where: { id: finishedId },
    });

    if (!finished) {
      throw new HttpException(
        'Treino finalizado não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // Se não for admin, verificar se o treino pertence ao usuário
    if (!isAdmin) {
      const hasAccess = await this.checkUserAccess(userId, finishedId);
      if (!hasAccess) {
        throw new HttpException(
          'Você não tem permissão para ver os comentários deste treino',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // Buscar todos os comentários do treino
    const allComments = await this.commentRepository.find({
      where: { finishedId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    // Separar comentários principais (sem parent) e respostas em estrutura hierárquica
    const commentMap = new Map();
    const rootComments = [];

    // Primeiro, criar o mapa de todos os comentários
    allComments.forEach((comment) => {
      commentMap.set(comment.id, {
        id: comment.id,
        content: comment.content,
        isAdmin: comment.isAdmin,
        read: comment.read,
        parentId: comment.parentId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          email: comment.author.email,
          avatar: comment.author.avatar,
        },
        replies: [],
      });
    });

    // Depois, organizar em estrutura hierárquica
    commentMap.forEach((comment) => {
      rootComments.push(comment);
    });
    return rootComments;
  }

  async deleteComment(
    userId: number,
    commentId: number,
    isAdmin: boolean,
  ): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new HttpException(
        'Comentário não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // Apenas o autor do comentário ou admin pode deletar
    if (!isAdmin && comment.authorId !== userId) {
      throw new HttpException(
        'Você não tem permissão para deletar este comentário',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.commentRepository.delete(commentId);
  }

  async updateComment(
    userId: number,
    commentId: number,
    content: string,
  ): Promise<CommentEntity> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new HttpException(
        'Comentário não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // Apenas o autor do comentário pode editar
    if (comment.authorId !== userId) {
      throw new HttpException(
        'Você não tem permissão para editar este comentário',
        HttpStatus.FORBIDDEN,
      );
    }

    comment.content = content;
    return await this.commentRepository.save(comment);
  }

  /**
   * Marca um ou mais comentários como lidos
   */
  async markAsRead(
    userId: number,
    commentIds: number[],
    isAdmin: boolean,
  ): Promise<void> {
    if (!commentIds || commentIds.length === 0) {
      return;
    }

    // Buscar os comentários
    const comments = await this.commentRepository.findBy({
      id: In(commentIds),
    });

    if (!comments || comments.length === 0) {
      throw new HttpException(
        'Nenhum comentário encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // Se não for admin, verificar permissão para cada comentário
    if (!isAdmin) {
      for (const comment of comments) {
        const hasAccess = await this.checkUserAccess(
          userId,
          comment.finishedId,
        );
        if (!hasAccess) {
          throw new HttpException(
            'Você não tem permissão para marcar este comentário como lido',
            HttpStatus.FORBIDDEN,
          );
        }
      }
    }

    // Marcar como lido
    await this.commentRepository.update({ id: In(commentIds) }, { read: true });
  }
  /**
   * Busca todos os comentários não lidos
   * Admin: recebe comentários de alunos não lidos
   * Aluno: recebe comentários de admins não lidos em seus treinos
   */
  async getUnreadComments(userId: number, isAdmin: boolean) {
    if (isAdmin) {
      // Admin recebe comentários de alunos (is_admin = false) que ainda não foram lidos
      const query = `
        SELECT 
          c.*,
          f.execution_day as "finishedExecutionDay",
          f.id as "finishedId",
          author.id as "authorId",
          author.name as "authorName",
          author.email as "authorEmail",
          author.avatar as "authorAvatar",
          training.name as "workoutName",
          training.id as "workoutId",
          customer.id as "customerId",
          customer.name as "customerName",
          customer.email as "customerEmail",
          customer.avatar as "customerAvatar"
        FROM comments c
        INNER JOIN finished f ON c.finished_id = f.id
        INNER JOIN customer author ON c.author_id = author.id
        INNER JOIN program p ON p.id = (
          CASE
            WHEN f.workout_id IS NOT NULL THEN (
              SELECT w.program_id
              FROM workout w
              WHERE w.id = f.workout_id
            )
            ELSE (
              SELECT w2.program_id
              FROM workouts w2
              WHERE w2.id = f.workouts_id
            )
          END
        )
        LEFT JOIN (
          SELECT 
            id::text as id, 
            name,
            'old' as source
          FROM workout
          UNION ALL
          SELECT 
            id::text as id, 
            title as name,
            'new' as source
          FROM workouts
        ) training ON (
          (f.workout_id::text = training.id AND training.source = 'old') OR
          (f.workouts_id::text = training.id AND training.source = 'new')
        )
        INNER JOIN customer ON p.customer_id = customer.id
        WHERE c.is_admin = false 
          AND c.read = false
        ORDER BY c.created_at DESC
      `;

      const results = await this.commentRepository.manager.query(query);

      return results.map((row) => ({
        id: row.id,
        content: row.content,
        isAdmin: row.is_admin,
        read: row.read,
        parentId: row.parent_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        finished: {
          id: row.finishedId,
          executionDay: row.finishedExecutionDay,
        },
        workout: {
          id: row.workoutId,
          name: row.workoutName,
        },
        author: {
          id: row.authorId,
          name: row.authorName,
          email: row.authorEmail,
          avatar: row.authorAvatar,
        },
        customer: {
          id: row.customerId,
          name: row.customerName,
          email: row.customerEmail,
          avatar: row.customerAvatar,
        },
      }));
    } else {
      // Aluno recebe comentários de admins (is_admin = true) em seus treinos que ainda não foram lidos
      const query = `
        SELECT 
          c.*,
          f.execution_day as "finishedExecutionDay",
          f.id as "finishedId",
          author.id as "authorId",
          author.name as "authorName",
          author.email as "authorEmail",
          author.avatar as "authorAvatar",
          training.name as "workoutName",
          training.id as "workoutId"
        FROM comments c
        INNER JOIN finished f ON c.finished_id = f.id
        INNER JOIN customer author ON c.author_id = author.id
        INNER JOIN program p ON p.id = (
          CASE
            WHEN f.workout_id IS NOT NULL THEN (
              SELECT w.program_id
              FROM workout w
              WHERE w.id = f.workout_id
            )
            ELSE (
              SELECT w2.program_id
              FROM workouts w2
              WHERE w2.id = f.workouts_id
            )
          END
        )
        LEFT JOIN (
          SELECT 
            id::text as id, 
            name,
            'old' as source
          FROM workout
          UNION ALL
          SELECT 
            id::text as id, 
            title as name,
            'new' as source
          FROM workouts
        ) training ON (
          (f.workout_id::text = training.id AND training.source = 'old') OR
          (f.workouts_id::text = training.id AND training.source = 'new')
        )
        WHERE c.is_admin = true 
          AND c.read = false
          AND p.customer_id = $1
        ORDER BY c.created_at DESC
      `;

      const results = await this.commentRepository.manager.query(query, [
        userId,
      ]);

      return results.map((row) => ({
        id: row.id,
        content: row.content,
        isAdmin: row.is_admin,
        read: row.read,
        parentId: row.parent_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        finished: {
          id: row.finishedId,
          executionDay: row.finishedExecutionDay,
        },
        workout: {
          id: row.workoutId,
          name: row.workoutName,
        },
        author: {
          id: row.authorId,
          name: row.authorName,
          email: row.authorEmail,
          avatar: row.authorAvatar,
        },
      }));
    }
  }

  /**
   * Verifica se o usuário tem acesso ao treino finalizado
   */
  private async checkUserAccess(
    userId: number,
    finishedId: number,
  ): Promise<boolean> {
    const result = await this.finishedRepository.manager.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM finished f
        INNER JOIN program p ON p.id = (
          CASE
            WHEN f.workout_id IS NOT NULL THEN (
              SELECT w.program_id
              FROM workout w
              WHERE w.id = f.workout_id
            )
            ELSE (
              SELECT w2.program_id
              FROM workouts w2
              WHERE w2.id = f.workouts_id
            )
          END
        )
        WHERE f.id = $1
          AND p.customer_id = $2
      ) as has_access
      `,
      [finishedId, userId],
    );
    return result[0]?.has_access ?? false;
  }
}

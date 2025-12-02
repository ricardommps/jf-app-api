import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FirebaseService } from 'src/firebase/firebase.service';
import { NotificationService } from 'src/notification/notification.service';
import { Repository } from 'typeorm';
import { FinishedEntity } from '../entities/finished.entity';
import { WorkoutsEntity } from '../entities/workouts.entity';

export class FinishedService {
  constructor(
    @InjectRepository(FinishedEntity)
    private finishedRepository: Repository<FinishedEntity>,

    @InjectRepository(WorkoutsEntity)
    private readonly workoutRepository: Repository<WorkoutsEntity>,

    private readonly firebaseService: FirebaseService,

    private readonly notificationService: NotificationService,
  ) {}

  async createFinished(payload) {
    try {
      const workout = await this.workoutRepository.findOne({
        where: { id: payload.workoutsId },
      });

      workout.finished = true;
      workout.unrealized = payload.unrealized;
      await this.workoutRepository.save(workout);
      return this.finishedRepository.save({
        ...payload,
      });
    } catch (error) {
      throw error;
    }
  }

  async getFinishedById(id: number): Promise<FinishedEntity> {
    return this.finishedRepository.findOne({
      where: { id },
    });
  }

  async getVolume(
    userId: number,
    programId: number,
    startDate: string,
    endDate: string,
  ) {
    // Verifica ownership do programa (uma query unificada em vez de duas)
    const programOwnership = await this.finishedRepository.manager.query(
      `
      SELECT pro.customer_id
      FROM program pro
      WHERE pro.id = $1
      LIMIT 1
      `,
      [programId],
    );

    if (
      !programOwnership.length ||
      programOwnership[0].customer_id !== userId
    ) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const endDateTime = `${endDate} 23:59:59`;

    // Query unificada usando UNION para ambas as tabelas
    const finishedTrainings = await this.finishedRepository.manager.query(
      `
      SELECT 
        finished.execution_day,
        finished.distance_in_meters,
        finished.duration_in_seconds,
        finished.workout_id,
        NULL as workouts_id
      FROM finished
      INNER JOIN workout ON finished.workout_id = workout.id
      WHERE workout.program_id = $1
        AND finished.execution_day >= $2
        AND finished.execution_day <= $3
        AND finished.unrealized = false
        AND workout.running = true
      
      UNION ALL
      
      SELECT 
        finished.execution_day,
        finished.distance_in_meters,
        finished.duration_in_seconds,
        NULL as workout_id,
        finished.workouts_id
      FROM finished
      INNER JOIN workouts ON finished.workouts_id = workouts.id
      WHERE workouts.program_id = $1
        AND finished.execution_day >= $2
        AND finished.execution_day <= $3
        AND finished.unrealized = false
        AND workouts.running = true
      
      ORDER BY execution_day ASC
      `,
      [programId, startDate, endDateTime],
    );

    // Calcula totais durante a formatação (uma única passagem)
    let totalDistanceInKm = 0;
    let totalDurationInSeconds = 0;

    const formattedFinishedTrainings = finishedTrainings.map((finished) => {
      // Acumula os totais
      totalDistanceInKm += finished.distance_in_meters
        ? finished.distance_in_meters / 100
        : 0;
      totalDurationInSeconds += finished.duration_in_seconds
        ? Number(finished.duration_in_seconds)
        : 0;

      // Formata o registro
      return {
        executionDay: finished.execution_day,
        distanceInKm: finished.distance_in_meters
          ? parseFloat((finished.distance_in_meters / 100).toFixed(2))
          : 0,
        durationInSeconds: finished.duration_in_seconds
          ? Number(finished.duration_in_seconds)
          : 0,
        workoutId: finished.workout_id || finished.workouts_id,
      };
    });

    // Ordena por data decrescente
    formattedFinishedTrainings.sort(
      (a, b) =>
        new Date(b.executionDay).getTime() - new Date(a.executionDay).getTime(),
    );

    return {
      data: formattedFinishedTrainings,
      totalDistanceInKm: parseFloat(totalDistanceInKm.toFixed(2)),
      totalDurationInSeconds,
    };
  }

  async history(userId: number) {
    // Query otimizada filtrando pelo mês atual
    const query = `
      SELECT 
        finished.*,
        training.name as "trainingName",
        training.subtitle as "trainingSubtitle", 
        training.description as "trainingDesc",
        training.running as "trainingRunninge",
        training.date_published as "trainingDatePublished",
        training.id as "trainingId",
        pro.name as "programName",
        pro.type,
        pro.goal,
        pro.pv,
        pro.pace as "programpace",
        pro.difficulty_level as "difficulty",
        pro.reference_month as "month",
        pro.id as "programId"
      FROM finished
      INNER JOIN (
        SELECT 
          id::text as id,
          name,
          subtitle,
          description,
          running,
          date_published,
          program_id,
          'old' as source
        FROM workout
        WHERE program_id IN (
          SELECT id FROM program WHERE customer_id = $1
        )
        
        UNION ALL
        
        SELECT 
          id::text as id,
          title as name,
          subtitle,
          description,
          running,
          date_published,
          program_id,
          'new' as source
        FROM workouts
        WHERE program_id IN (
          SELECT id FROM program WHERE customer_id = $1
        )
      ) training ON (
        (finished.workout_id::text = training.id AND training.source = 'old') OR
        (finished.workouts_id::text = training.id AND training.source = 'new')
      )
      INNER JOIN program pro ON training.program_id = pro.id
      WHERE TO_TIMESTAMP(finished.execution_day, 'YYYY-MM-DD') >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY finished.execution_day DESC
    `;

    const finishedTrainings = await this.finishedRepository.manager.query(
      query,
      [userId],
    );

    // Função helper para conversão camelCase (mais eficiente)
    const toCamelCase = (str: string): string =>
      str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    // Formatação otimizada usando Object.fromEntries
    const formattedFinishedTrainings = finishedTrainings.map((finished) =>
      Object.fromEntries(
        Object.entries(finished).map(([key, value]) => [
          toCamelCase(key),
          value,
        ]),
      ),
    );

    return formattedFinishedTrainings;
  }

  async findFinishedById(userId: number, id: number) {
    const query = `
      SELECT 
        finished.*,
        training.name as "trainingName",
        training.subtitle as "trainingSubtitle",
        training.description as "trainingDesc",
        training.date_published as "trainingDatePublished",
        training.id as "trainingId",
        pro.name as "programName",
        pro.type as "type",
        pro.goal as "goal",
        pro.pv as "pv",
        pro.pace as "programpace",
        pro.difficulty_level as "difficulty",
        pro.reference_month as "month",
        pro.id as "programId"
      FROM finished
      INNER JOIN (
        SELECT 
          id::text as id, 
          name, 
          subtitle, 
          description, 
          date_published, 
          program_id, 
          'old' as source
        FROM workout
        UNION ALL
        SELECT 
          id::text as id, 
          title as name, 
          subtitle, 
          description, 
          date_published, 
          program_id, 
          'new' as source
        FROM workouts
      ) training ON (
        (finished.workout_id::text = training.id AND training.source = 'old') OR
        (finished.workouts_id::text = training.id AND training.source = 'new')
      )
      LEFT JOIN program pro ON training.program_id = pro.id
      WHERE pro.customer_id = $1
        AND finished.id = $2
      ORDER BY finished.execution_day DESC
    `;
    const finishedTrainings = await this.finishedRepository.manager.query(
      query,
      [userId, id],
    );

    const formattedFinishedTrainings = finishedTrainings.map((finished) => {
      const formatted = {};
      Object.keys(finished).forEach((key) => {
        const camelCaseKey = key.replace(/_([a-z])/g, (match, letter) =>
          letter.toUpperCase(),
        );
        formatted[camelCaseKey] = finished[key];
      });
      return formatted;
    });

    return formattedFinishedTrainings;
  }

  async reviewWorkout(customerId: string, id: number, feedback: string) {
    const finished = await this.finishedRepository.findOne({
      where: {
        id: id,
      },
    });

    if (!finished) {
      throw new NotFoundException(`finished not found`);
    }

    const finishedSave = await this.finishedRepository.save({
      ...finished,
      feedback: feedback,
      review: true,
    });

    if (customerId && finished) {
      // {
      //   title: 'Título da Notificação',
      //   body: 'Corpo da notificação',
      //   screen: 'profile',
      //   params: { id: '123', source: 'push' },
      // }
      const payloadNotification = {
        recipientId: customerId,
        title: 'Olá',
        content: 'O feedback do seu último treino já está disponível! Vem ver!',
        type: 'feedback',
        link: finishedSave.id,
      };
      const notification =
        await this.notificationService.createNotification(payloadNotification);
      const message = {
        title: payloadNotification.title,
        body: payloadNotification.content,
        data: {
          url: `jfapp://feedback?feedbackId=${finishedSave.id}&notificationId=${notification.id}`,
          screen: 'feedback',
          params: `{\"feedbackId\":\"${finishedSave.id}\",\"notificationId\":\"${notification.id}\",\"source\":\"push\"}`,
        },
      };
      await this.firebaseService.sendNotificationNew(customerId, message);
    }

    return this.getFinishedById(id);
  }

  async getUnreviewedFinished() {
    const query = `
      SELECT 
        finished.*,
        training.name as "trainingName",
        training.subtitle as "trainingSubtitle",
        training.description as "trainingDesc",
        training.date_published as "trainingDatePublished",
        training.id as "trainingId",
        training.source as "trainingSource",
        training.running as "trainingRunning",
        pro.name as "programName",
        pro.type as "type",
        pro.goal as "goal",
        pro.pv as "pv",
        pro.pace as "programpace",
        pro.difficulty_level as "difficulty",
        pro.reference_month as "month",
        pro.id as "programId",
        customer.id as "customerId",
        customer.name as "customerName",
        customer.email as "customerEmail",
        customer.phone as "customerPhone",
        customer.avatar as "customerAvatar"
      FROM finished
      INNER JOIN (
        SELECT 
          id::text as id, 
          name, 
          subtitle, 
          description, 
          date_published, 
          program_id, 
          running,
          'old' as source
        FROM workout
        UNION ALL
        SELECT 
          id::text as id, 
          title as name, 
          subtitle, 
          description, 
          date_published, 
          program_id, 
          running,
          'new' as source
        FROM workouts
      ) training ON (
        (finished.workout_id::text = training.id AND training.source = 'old') OR
        (finished.workouts_id::text = training.id AND training.source = 'new')
      )
      LEFT JOIN program pro ON training.program_id = pro.id
      LEFT JOIN customer ON pro.customer_id = customer.id
      WHERE finished.review IS NULL OR finished.review = false
      ORDER BY finished.execution_day DESC
    `;

    const results = await this.finishedRepository.manager.query(query);
    // Formatar para camelCase
    return results.map((row) => {
      const formatted: any = {};
      Object.keys(row).forEach((key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
          letter.toUpperCase(),
        );
        formatted[camelKey] = row[key];
      });

      return {
        id: formatted.id,
        workoutId: formatted.workoutId || formatted.workoutsId,
        distance: formatted.distance,
        duration: formatted.duration,
        pace: formatted.pace,
        link: formatted.link,
        rpe: formatted.rpe,
        trimp: formatted.trimp,
        review: formatted.review,
        executionDay: formatted.executionDay,
        comments: formatted.comments,
        feedback: formatted.feedback,
        unrealized: formatted.unrealized,
        intensities: formatted.intensities,
        outdoor: formatted.outdoor,
        unitMeasurement: formatted.unitMeasurement,
        typeWorkout: formatted.typeWorkout,
        distanceInMeters: formatted.distanceInMeters,
        durationInSeconds: formatted.durationInSeconds,
        coolDownDuration: formatted.coolDownDuration,
        coolDownIntensities: formatted.coolDownIntensities,
        warmUpDuration: formatted.warmUpDuration,
        warmUpIntensities: formatted.warmUpIntensities,
        unitmeasurement: formatted.unitmeasurement,
        paceInSeconds: formatted.paceInSeconds,
        checkList: formatted.checkList,
        createdAt: formatted.createdAt,
        updatedAt: formatted.updatedAt,
        workout: {
          id: formatted.trainingId,
          name: formatted.trainingName,
          subtitle: formatted.trainingSubtitle,
          description: formatted.trainingDesc,
          datePublished: formatted.trainingDatePublished,
          source: formatted.trainingSource,
          running: formatted.trainingRunning,
        },
        customer: {
          id: formatted.customerId,
          name: formatted.customerName,
          email: formatted.customerEmail,
          phone: formatted.customerPhone,
          avatar: formatted.customerAvatar,
        },
      };
    });
  }

  async getTrimp(userId: number) {
    // === Cálculo das últimas 4 semanas ===
    const today = new Date();

    // Encontra a segunda-feira da semana atual
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    // 3 semanas antes → início do intervalo
    const startDateObj = new Date(currentMonday);
    startDateObj.setDate(currentMonday.getDate() - 21); // 3 semanas antes
    const startDate = startDateObj.toISOString().slice(0, 10);

    // Domingo da semana atual → fim do intervalo
    const endDateObj = new Date(currentMonday);
    endDateObj.setDate(currentMonday.getDate() + 6);
    const endDate = endDateObj.toISOString().slice(0, 10);
    const endDateTime = `${endDate} 23:59:59`;

    // === Query combinada workout + workouts ===
    const finished = await this.finishedRepository.manager.query(
      `
        SELECT 
          f.execution_day,
          f.rpe,
          f.duration_in_seconds,
          f.trimp,
          w.running
        FROM finished f
        INNER JOIN workout w ON f.workout_id = w.id
        INNER JOIN program p1 ON w.program_id = p1.id
        WHERE p1.customer_id = $1
          AND f.execution_day >= $2
          AND f.execution_day <= $3
          AND f.unrealized = false
  
        UNION ALL
  
        SELECT 
          f.execution_day,
          f.rpe,
          f.duration_in_seconds,
          f.trimp,
          ws.running
        FROM finished f      
        INNER JOIN workouts ws ON f.workouts_id = ws.id
        INNER JOIN program p2 ON ws.program_id = p2.id
        WHERE p2.customer_id = $1
          AND f.execution_day >= $2
          AND f.execution_day <= $3
          AND f.unrealized = false
  
        ORDER BY execution_day ASC
      `,
      [userId, startDate, endDateTime],
    );

    const formatted = finished.map((f) => {
      const duration = Number(f.duration_in_seconds ?? 0);
      const rpe = Number(f.rpe ?? 0);

      const trimp =
        duration > 0 && rpe > 0
          ? Number(((duration / 60) * rpe).toFixed(2))
          : 0;

      return {
        executionDay: f.execution_day,
        rpe,
        durationInSeconds: duration,
        trimp,
        running: Boolean(f.running),
      };
    });

    formatted.sort(
      (a, b) =>
        new Date(b.executionDay).getTime() - new Date(a.executionDay).getTime(),
    );

    return {
      data: formatted,
      startDate,
      endDate,
    };
  }
}

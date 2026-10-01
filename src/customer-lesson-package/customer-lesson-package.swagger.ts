export const customerLessonPackageSwagger = {
  openapi: '3.0.0',
  info: {
    title: 'Customer Lesson Packages API',
    version: '1.0.0',
    description:
      'Documentacao dos endpoints de cronograma e controle de aulas do pacote.',
  },
  servers: [
    {
      url: '/api/v2',
    },
  ],
  tags: [
    {
      name: 'Customer Lesson Packages',
      description: 'Pacotes, aulas, pendencias e calendario de aulas.',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      LessonPackageStatus: {
        type: 'string',
        enum: ['active', 'paused', 'finished'],
      },
      LessonClassStatus: {
        type: 'string',
        enum: ['scheduled', 'pending', 'finished', 'canceled'],
      },
      LessonClassType: {
        type: 'string',
        enum: ['regular', 'pending', 'barter'],
      },
      LessonClassInput: {
        type: 'object',
        required: ['scheduledDate', 'type'],
        properties: {
          scheduledDate: {
            type: 'string',
            format: 'date',
            example: '2026-10-01',
          },
          scheduledTime: {
            type: 'string',
            example: '08:00',
            nullable: true,
          },
          type: {
            $ref: '#/components/schemas/LessonClassType',
          },
          notes: {
            type: 'string',
            example: 'Aula de personal',
            nullable: true,
          },
        },
      },
      CreateLessonPackage: {
        type: 'object',
        required: ['customerId', 'title', 'lessonUnitPrice', 'classes'],
        properties: {
          customerId: {
            type: 'integer',
            example: 10,
          },
          createdById: {
            type: 'integer',
            example: 2,
            nullable: true,
          },
          title: {
            type: 'string',
            example: 'Mes Setembro',
          },
          description: {
            type: 'string',
            example: 'Personal 3x/semana + permuta semanal',
            nullable: true,
          },
          lessonUnitPrice: {
            type: 'number',
            minimum: 0.01,
            example: 120,
          },
          status: {
            $ref: '#/components/schemas/LessonPackageStatus',
          },
          classes: {
            type: 'array',
            minItems: 1,
            items: {
              $ref: '#/components/schemas/LessonClassInput',
            },
          },
        },
      },
      UpdateLessonPackage: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            example: 'Mes Outubro',
          },
          description: {
            type: 'string',
            example: 'Personal 2x/semana',
            nullable: true,
          },
          lessonUnitPrice: {
            type: 'number',
            minimum: 0.01,
            example: 130,
          },
          status: {
            $ref: '#/components/schemas/LessonPackageStatus',
          },
        },
      },
      UpdateLessonPackageStatus: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            $ref: '#/components/schemas/LessonPackageStatus',
          },
        },
      },
      AddLessonClasses: {
        type: 'object',
        required: ['classes'],
        properties: {
          classes: {
            type: 'array',
            minItems: 1,
            items: {
              $ref: '#/components/schemas/LessonClassInput',
            },
          },
        },
      },
      UpdateLessonClass: {
        type: 'object',
        properties: {
          scheduledDate: {
            type: 'string',
            format: 'date',
            example: '2026-10-02',
          },
          scheduledTime: {
            type: 'string',
            example: '09:00',
            nullable: true,
          },
          type: {
            $ref: '#/components/schemas/LessonClassType',
          },
          notes: {
            type: 'string',
            example: 'Remarcada para manha',
            nullable: true,
          },
        },
      },
      UpdateLessonClassStatus: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            $ref: '#/components/schemas/LessonClassStatus',
          },
        },
      },
      MarkLessonClassPending: {
        type: 'object',
        properties: {
          rescheduledDate: {
            type: 'string',
            format: 'date',
            example: '2026-10-05',
            nullable: true,
          },
          rescheduledTime: {
            type: 'string',
            example: '08:00',
            nullable: true,
          },
          justification: {
            type: 'string',
            example: 'Aluno precisou remarcar',
            nullable: true,
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          statusCode: {
            type: 'integer',
            example: 400,
          },
          message: {
            oneOf: [
              {
                type: 'string',
              },
              {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            ],
            example: 'O aluno ja tem um pacote ativo',
          },
          error: {
            type: 'string',
            example: 'Bad Request',
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/customer-lesson-packages': {
      post: {
        tags: ['Customer Lesson Packages'],
        summary: 'Criar pacote com aulas',
        description:
          'Cria um pacote de aulas para um customer. Nao permite criar se o aluno ja possuir pacote ativo.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateLessonPackage',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Pacote criado com sucesso.',
          },
          '400': {
            description: 'Validacao ou pacote ativo existente.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '403': {
            description: 'Acesso permitido somente para Admin e Root.',
          },
        },
      },
    },
    '/customer-lesson-packages/customer/{customerId}': {
      get: {
        tags: ['Customer Lesson Packages'],
        summary: 'Listar pacotes por customerId',
        parameters: [
          {
            name: 'customerId',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de pacotes do customer.',
          },
        },
      },
    },
    '/customer-lesson-packages/customer/{customerId}/active': {
      get: {
        tags: ['Customer Lesson Packages'],
        summary: 'Listar pacotes ativos por customerId',
        parameters: [
          {
            name: 'customerId',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de pacotes ativos do customer.',
          },
        },
      },
    },
    '/customer-lesson-packages/pending-classes': {
      get: {
        tags: ['Customer Lesson Packages'],
        summary: 'Listar aulas pendentes',
        parameters: [
          {
            name: 'customerId',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
            },
          },
          {
            name: 'packageId',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de aulas pendentes.',
          },
        },
      },
    },
    '/customer-lesson-packages/calendar': {
      get: {
        tags: ['Customer Lesson Packages'],
        summary: 'Listar calendario de aulas por periodo',
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              format: 'date',
            },
          },
          {
            name: 'endDate',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              format: 'date',
            },
          },
          {
            name: 'customerId',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Aulas do periodo.',
          },
        },
      },
    },
    '/customer-lesson-packages/{id}': {
      get: {
        tags: ['Customer Lesson Packages'],
        summary: 'Buscar detalhe do pacote',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Detalhe do pacote.',
          },
          '404': {
            description: 'Pacote nao encontrado.',
          },
        },
      },
      patch: {
        tags: ['Customer Lesson Packages'],
        summary: 'Editar dados basicos do pacote',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateLessonPackage',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Pacote atualizado.',
          },
        },
      },
    },
    '/customer-lesson-packages/{id}/status': {
      patch: {
        tags: ['Customer Lesson Packages'],
        summary: 'Alterar status do pacote',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateLessonPackageStatus',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Status do pacote atualizado.',
          },
        },
      },
    },
    '/customer-lesson-packages/{id}/classes': {
      get: {
        tags: ['Customer Lesson Packages'],
        summary: 'Listar aulas de um pacote',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de aulas do pacote.',
          },
        },
      },
      post: {
        tags: ['Customer Lesson Packages'],
        summary: 'Adicionar aulas ao pacote',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AddLessonClasses',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Aulas adicionadas e resumo recalculado.',
          },
        },
      },
    },
    '/customer-lesson-packages/classes/{classId}': {
      patch: {
        tags: ['Customer Lesson Packages'],
        summary: 'Editar data, horario, tipo ou observacao da aula',
        parameters: [
          {
            name: 'classId',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateLessonClass',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Aula atualizada.',
          },
        },
      },
    },
    '/customer-lesson-packages/classes/{classId}/status': {
      patch: {
        tags: ['Customer Lesson Packages'],
        summary: 'Alterar status da aula',
        description:
          'Quando o status enviado for pending, tambem cria um registro de pendencia.',
        parameters: [
          {
            name: 'classId',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateLessonClassStatus',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Status da aula atualizado.',
          },
        },
      },
    },
    '/customer-lesson-packages/classes/{classId}/pending': {
      patch: {
        tags: ['Customer Lesson Packages'],
        summary: 'Marcar aula como pendente',
        parameters: [
          {
            name: 'classId',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/MarkLessonClassPending',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Aula marcada como pendente.',
          },
        },
      },
    },
    '/customer-lesson-packages/classes/{classId}/cancel': {
      patch: {
        tags: ['Customer Lesson Packages'],
        summary: 'Cancelar aula',
        parameters: [
          {
            name: 'classId',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Aula cancelada.',
          },
        },
      },
    },
    '/customer-lesson-packages/classes/{classId}/finish': {
      patch: {
        tags: ['Customer Lesson Packages'],
        summary: 'Finalizar aula',
        parameters: [
          {
            name: 'classId',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Aula finalizada.',
          },
        },
      },
    },
  },
} as const;

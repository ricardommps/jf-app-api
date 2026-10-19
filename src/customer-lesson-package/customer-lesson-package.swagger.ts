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
          warnings: {
            type: 'string',
            example: 'Avisar com 24h de antecedencia em caso de remarcacao',
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
          warnings: {
            type: 'string',
            example: 'Aluno prefere treinar pela manha',
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
          addClasses: {
            type: 'array',
            description: 'Novas aulas, adicionadas com status Programada.',
            items: { $ref: '#/components/schemas/LessonClassInput' },
          },
          removeClassIds: {
            type: 'array',
            uniqueItems: true,
            description:
              'IDs das aulas a excluir. Devem pertencer ao pacote e estar com status Programada.',
            items: { type: 'integer', minimum: 1 },
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
    '/customer-lesson-packages/my-packages': {
      get: {
        tags: ['Customer Lesson Packages'],
        summary: 'Consultar os pacotes do aluno autenticado',
        description:
          'Retorna os pacotes ativos, pausados e finalizados, com suas aulas e avisos. O aluno é identificado pelo token; IDs enviados pela URL não alteram o aluno consultado.',
        responses: {
          '200': { description: 'Pacotes do aluno, ou uma lista vazia.' },
          '401': { description: 'Aluno não identificado no token.' },
          '403': {
            description: 'Token inválido ou perfil sem acesso de aluno.',
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
    '/customer-lesson-packages/expiring': {
      get: {
        tags: ['Customer Lesson Packages'],
        summary: 'Listar pacotes ativos próximos ao vencimento',
        description:
          'Usa a maior data de aula do pacote, independentemente do status da aula. Inclui a janela de 2 dias atrás a 7 dias à frente. Dias restantes são arredondados para cima até o fim do dia da última aula, seguindo a regra dos programas.',
        responses: {
          '200': {
            description: 'Pacotes ativos com aulas e vencimento na janela.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      packageId: { type: 'integer' },
                      title: { type: 'string' },
                      customerId: { type: 'integer' },
                      customerName: { type: 'string' },
                      avatar: { type: 'string', nullable: true },
                      endDate: { type: 'string', format: 'date' },
                      daysUntilExpiration: { type: 'integer' },
                    },
                  },
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
          '400': {
            description:
              'Dados inválidos, exclusão de aula não programada ou tentativa de finalizar com aulas programadas. Nenhuma alteração é salva em caso de erro.',
          },
        },
      },
      delete: {
        tags: ['Customer Lesson Packages'],
        summary: 'Excluir pacote',
        description:
          'Exclui o pacote pelo id. As aulas e pendencias vinculadas sao removidas por cascade.',
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
            description: 'Pacote excluido com sucesso.',
          },
          '404': {
            description: 'Pacote nao encontrado.',
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
          '400': {
            description:
              'Não é possível finalizar: o pacote ainda tem aulas programadas.',
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
        description:
          'Ao alterar a data, ela deve ficar dentro do intervalo de inicio e fim do pacote. Quando a data muda, o aluno recebe uma notificacao push informando a remarcacao.',
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

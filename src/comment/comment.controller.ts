import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { IsAdmin } from 'src/decorators/is-admin.decorator';
import { UserId } from 'src/decorators/user-id.decorator';
import { CreateCommentDto } from 'src/dtos/create-comment.dto';
import { Roles } from '../decorators/roles.decorator';
import { UserType } from '../utils/user-type.enum';
import { CommentService } from './comment.service';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Post()
  async createComment(
    @UserId() loggedUserId: number,
    @IsAdmin() isAdmin: boolean,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentService.createComment(
      loggedUserId,
      createCommentDto,
      isAdmin,
    );
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Put('mark-as-read')
  async markAsRead(
    @UserId() userId: number,
    @IsAdmin() isAdmin: boolean,
    @Body() body,
  ) {
    // Normalizar para array
    const commentIds = Array.isArray(body.commentIds)
      ? body.commentIds
      : [body.commentIds];

    await this.commentService.markAsRead(userId, commentIds, isAdmin);

    return { message: 'Comentário(s) marcado(s) como lido(s)' };
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('finished/:finishedId')
  async getCommentsByFinished(
    @UserId() userId: number,
    @IsAdmin() isAdmin: boolean,
    @Param('finishedId') finishedId: string,
  ) {
    return this.commentService.getCommentsByFinished(
      userId,
      Number(finishedId),
      isAdmin,
    );
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Delete(':commentId')
  async deleteComment(
    @UserId() userId: number,
    @IsAdmin() isAdmin: boolean,
    @Param('commentId') commentId: string,
  ) {
    await this.commentService.deleteComment(userId, Number(commentId), isAdmin);
    return { message: 'Comentário deletado com sucesso' };
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Put(':commentId')
  async updateComment(
    @UserId() userId: number,
    @Param('commentId') commentId: string,
    @Body('content') content: string,
  ) {
    return this.commentService.updateComment(
      userId,
      Number(commentId),
      content,
    );
  }
}

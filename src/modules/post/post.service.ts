import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

import type { PageDto } from '../../common/dto/page.dto.ts';
import { ResponseCore } from '../../common/dto/response-core.dto.ts';
import { ErrorCode } from '../../constants/error-code.ts';
import { CreatePostCommand } from './commands/create-post.command.ts';
import { CreatePostDto } from './dtos/create-post.dto.ts';
import type { PostDto } from './dtos/post.dto.ts';
import type { PostPageOptionsDto } from './dtos/post-page-options.dto.ts';
import type { UpdatePostDto } from './dtos/update-post.dto.ts';
import { PostEntity } from './post.entity.ts';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(PostEntity)
    private postRepository: Repository<PostEntity>,
    private commandBus: CommandBus,
  ) {}

  @Transactional()
  createPost(userId: Uuid, createPostDto: CreatePostDto): Promise<PostEntity> {
    return this.commandBus.execute<CreatePostCommand, PostEntity>(
      new CreatePostCommand(userId, createPostDto),
    );
  }

  async getAllPost(
    postPageOptionsDto: PostPageOptionsDto,
  ): Promise<PageDto<PostDto>> {
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.translations', 'postTranslation');
    const [items, pageMetaDto] =
      await queryBuilder.paginate(postPageOptionsDto);

    return items.toPageDto(pageMetaDto);
  }

  async getSinglePost(id: Uuid): Promise<ResponseCore<PostEntity>> {
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .where('post.id = :id', { id });

    const postEntity = await queryBuilder.getOne();

    if (!postEntity) {
      return ResponseCore.fail(ErrorCode.NOT_FOUND, 'error.postNotFound');
    }

    return ResponseCore.ok(postEntity);
  }

  async updatePost(
    id: Uuid,
    updatePostDto: UpdatePostDto,
  ): Promise<ResponseCore<null>> {
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .where('post.id = :id', { id });

    const postEntity = await queryBuilder.getOne();

    if (!postEntity) {
      return ResponseCore.fail(ErrorCode.NOT_FOUND, 'error.postNotFound');
    }

    this.postRepository.merge(postEntity, updatePostDto);

    await this.postRepository.save(updatePostDto);

    return ResponseCore.ok(null);
  }

  async deletePost(id: Uuid): Promise<ResponseCore<null>> {
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .where('post.id = :id', { id });

    const postEntity = await queryBuilder.getOne();

    if (!postEntity) {
      return ResponseCore.fail(ErrorCode.NOT_FOUND, 'error.postNotFound');
    }

    await this.postRepository.remove(postEntity);

    return ResponseCore.ok(null);
  }
}

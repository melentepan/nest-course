import {
  Controller,
  Get,
  // Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
// import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // @Post()
  // create(@Body() createUserDto: CreateUserDto) {
  //   return this.usersService.create(createUserDto);
  // }

  @ApiOperation({
    summary: 'Получение всех пользователей',
  })
  @ApiOkResponse({ type: PaginatedUsersResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Access-токен отсутствует, недействителен или истёк',
  })
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  @ApiOperation({
    summary: 'Получение пользователя по ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID пользователя',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'ID должен быть числом' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @ApiOperation({
    summary: 'Изменение пользователя по ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID пользователя',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'ID или данные запроса некорректны' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  @ApiConflictResponse({ description: 'Логин или email уже заняты' })
  @ApiForbiddenResponse({ description: 'Нет доступа к этому аккаунту' })
  @Patch(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('sub') actorId: number,
  ) {
    return this.usersService.update(id, updateUserDto, actorId);
  }

  @ApiOperation({
    summary: 'Удаление пользователя по ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID пользователя',
    type: Number,
    example: 1,
  })
  @ApiNoContentResponse({ description: 'Пользователь мягко удалён' })
  @ApiBadRequestResponse({ description: 'ID должен быть числом' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  @ApiForbiddenResponse({ description: 'Нет доступа к этому аккаунту' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser('sub') actorId: number,
  ) {
    return this.usersService.remove(id, actorId);
  }

  @ApiOperation({
    summary: 'Восстановление пользователя по ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID пользователя',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'ID должен быть числом' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  @ApiConflictResponse({
    description: 'Пользователь не удалён или его логин/email уже заняты',
  })
  @ApiForbiddenResponse({ description: 'Доступно только администратору' })
  @Patch(':id/restore')
  restore(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser('sub') actorId: number,
  ) {
    return this.usersService.restore(id, actorId);
  }
}

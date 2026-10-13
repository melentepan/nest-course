import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
// import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { ParseIdPipe } from '../../common/pipes/parseId.pipe';
import { CurrentUser } from '../../common/decorators/currentUser.decorator';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { PaginationQueryDto } from './dto/paginationQuery.dto';
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserResponseDto } from './dto/userResponse.dto';
import { PaginatedUsersResponseDto } from './dto/paginatedUsersResponse.dto';
import { BalanceService } from './balance.service';
import { TransferMoneyDto } from './dto/transferMoney.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly balanceService: BalanceService,
  ) {}

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Перевод USD текущего пользователя другому пользователю',
  })
  @ApiOkResponse({
    description:
      'Перевод выполнен; возвращаются recipientId, amount и остаток balance отправителя',
  })
  @ApiBadRequestResponse({
    description: 'Некорректная сумма, получатель или перевод самому себе',
  })
  @ApiNotFoundResponse({ description: 'Отправитель или получатель не найден' })
  @ApiConflictResponse({
    description:
      'Недостаточно средств или превышен максимальный баланс получателя',
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется действующий access-токен',
  })
  transfer(
    @Body() dto: TransferMoneyDto,
    @CurrentUser('sub') senderId: number,
  ) {
    return this.balanceService.transfer(senderId, dto);
  }

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

  @Get('active')
  @ApiOperation({
    summary: 'Пользователи с описанием и более чем двумя активными аватарками',
    description:
      'Возвращает пользователей в заданном диапазоне возраста и последнюю активную аватарку каждого в массиве avatars.',
  })
  @ApiQuery({ name: 'minAge', type: Number, required: true, example: 18 })
  @ApiQuery({ name: 'maxAge', type: Number, required: true, example: 35 })
  @ApiOkResponse({
    description:
      'Список подходящих пользователей; при отсутствии результатов — пустой массив',
  })
  @ApiBadRequestResponse({
    description:
      'Границы возраста должны быть неотрицательными целыми числами; minAge не должен превышать maxAge',
  })
  @ApiUnauthorizedResponse({
    description: 'Access-токен отсутствует, недействителен или истёк',
  })
  getActiveUsers(
    @Query('minAge', ParseIntPipe) minAge: number,
    @Query('maxAge', ParseIntPipe) maxAge: number,
  ) {
    return this.usersService.getActiveUsers(minAge, maxAge);
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
    return this.usersService.getProfile(id);
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

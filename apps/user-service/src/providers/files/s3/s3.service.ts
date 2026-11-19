import * as AWS from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { IFileService } from '../files.adapter';
import { S3Lib } from './constants/doSpacesServiceLib.constant';
import { RemoveException } from './exceptions/remove.exception';
import { UploadException } from './exceptions/upload.exception';
import { UploadFilePayloadDto } from './dto/uploadFilePayload.dto';
import { UploadFileResultDto } from './dto/uploadFileResult.dto';
import { RemoveFilePayloadDto } from './dto/removeFilePayload.dto';

@Injectable()
export class S3Service extends IFileService {
  private readonly logger = new Logger(S3Service.name);

  private readonly bucketName = 'user-avatars';

  constructor(@Inject(S3Lib) private readonly S3: AWS.S3) {
    super();
  }

  uploadFile(dto: UploadFilePayloadDto): Promise<UploadFileResultDto> {
    const { folder, file, name } = dto;
    const path = `${folder}/${name}`;

    this.logger.debug('Начало загрузки файла в бакет');

    return new Promise((resolve, reject) => {
      this.S3.putObject(
        {
          Bucket: this.bucketName,
          Key: path,
          Body: file.buffer,
          ACL: 'public-read',
          ContentType: file.mimetype,
        },
        (error: unknown) => {
          if (!error) {
            this.logger.log('Файл успешно загружен');
            resolve({
              path,
            });
          } else {
            this.logger.error(`Ошибка загрузки файла с ключом: ${path}`);
            reject(
              new UploadException(
                error instanceof Error ? error.message : undefined,
              ),
            );
          }
        },
      );
    });
  }

  removeFile(dto: RemoveFilePayloadDto): Promise<void> {
    const { path } = dto;

    this.logger.debug('Начало удаления файла из бакета');

    return new Promise((resolve, reject) => {
      this.S3.deleteObject(
        {
          Bucket: this.bucketName,
          Key: path,
        },
        (error: unknown) => {
          if (!error) {
            this.logger.log('Файл успешно удалён');
            resolve();
          } else {
            this.logger.error(`Ошибка удаления файла с ключом: ${path}`);
            reject(
              new RemoveException(
                error instanceof Error ? error.message : undefined,
              ),
            );
          }
        },
      );
    });
  }
}

import { UploadFilePayloadDto } from './s3/dto/uploadFilePayload.dto';
import { UploadFileResultDto } from './s3/dto/uploadFileResult.dto';
import { RemoveFilePayloadDto } from './s3/dto/removeFilePayload.dto';

export abstract class IFileService {
  abstract uploadFile(dto: UploadFilePayloadDto): Promise<UploadFileResultDto>;

  abstract removeFile(dto: RemoveFilePayloadDto): Promise<void>;
}

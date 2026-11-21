export interface HttpErrorResponse {
  statusCode: number;
  message: string | string[];
  requestId: string;
  timestamp: string;
  path: string;
}

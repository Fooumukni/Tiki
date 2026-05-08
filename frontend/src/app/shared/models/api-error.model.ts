export interface ApiErrorResponse {
  timestamp?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  message?: string;
}

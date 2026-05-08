import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { ApiErrorResponse } from '../models/api-error.model';

export function resolveApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof TimeoutError) {
    return 'The request took too long. Please try again.';
  }

  if (!(error instanceof HttpErrorResponse)) {
    return fallbackMessage;
  }

  if (error.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (error.error && typeof error.error === 'object' && 'message' in error.error) {
    const apiError = error.error as ApiErrorResponse;
    return apiError.message || fallbackMessage;
  }

  return fallbackMessage;
}

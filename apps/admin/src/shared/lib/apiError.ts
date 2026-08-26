import { isAxiosError } from 'axios';

type NestErrorBody = {
  message?: string | string[];
  error?: string | { code?: string; message?: string };
};

function extractServerMessage(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  const body = data as NestErrorBody;
  if (typeof body.error === 'object' && body.error !== null && body.error.message) {
    return body.error.message;
  }

  if (Array.isArray(body.message)) {
    return body.message.join(', ');
  }

  if (typeof body.message === 'string') {
    return body.message;
  }

  return undefined;
}

export function isForbiddenError(err: unknown): boolean {
  return isAxiosError(err) && err.response?.status === 403;
}

export function getApiErrorMessage(err: unknown, fallback = 'Не удалось выполнить запрос'): string {
  if (!isAxiosError(err)) {
    return fallback;
  }

  const status = err.response?.status;
  const serverMessage = extractServerMessage(err.response?.data);

  if (status === 403) {
    return serverMessage
      ? `Недостаточно прав (403): ${serverMessage}`
      : 'Недостаточно прав (403). Нужна роль admin.';
  }

  if (status === 404) {
    return serverMessage ?? 'Ресурс не найден (404).';
  }

  if (status === 400) {
    return serverMessage ?? 'Ошибка валидации (400).';
  }

  if (status === 409) {
    return serverMessage ?? 'Конфликт данных (409). Возможно, код уже занят.';
  }

  if (status === 401) {
    return 'Сессия истекла. Войдите снова.';
  }

  return serverMessage ?? fallback;
}

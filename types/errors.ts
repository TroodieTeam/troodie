export type ErrorCode = 
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface AppError extends Error {
  code: ErrorCode;
  statusCode?: number;
  details?: any;
  retry?: boolean;
}

export class NetworkError extends Error implements AppError {
  code: ErrorCode = 'NETWORK_ERROR';
  retry = true;
  
  constructor(message: string = 'Network connection failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ServerError extends Error implements AppError {
  code: ErrorCode = 'SERVER_ERROR';
  statusCode?: number;
  retry = true;
  
  constructor(message: string = 'Server error occurred', statusCode?: number) {
    super(message);
    this.name = 'ServerError';
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends Error implements AppError {
  code: ErrorCode = 'NOT_FOUND';
  retry = false;
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends Error implements AppError {
  code: ErrorCode = 'PERMISSION_DENIED';
  retry = false;
  
  constructor(message: string = 'Permission denied') {
    super(message);
    this.name = 'PermissionError';
  }
}

export class TimeoutError extends Error implements AppError {
  code: ErrorCode = 'TIMEOUT';
  retry = true;
  
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function isNetworkError(error: any): boolean {
  return error?.code === 'NETWORK_ERROR' || 
         error?.message?.toLowerCase().includes('network') ||
         error?.message?.toLowerCase().includes('fetch') ||
         error?.message?.toLowerCase().includes('internet') ||
         error?.message?.toLowerCase().includes('failed to connect') ||
         error?.message?.toLowerCase().includes('connection refused');
}

export function getErrorType(error: any): 'network' | 'server' | 'notFound' | 'permission' | 'generic' {
  if (isNetworkError(error)) return 'network';
  if (error?.code === 'NOT_FOUND' || error?.statusCode === 404) return 'notFound';
  if (error?.code === 'PERMISSION_DENIED' || error?.statusCode === 403) return 'permission';
  if (error?.code === 'SERVER_ERROR' || (error?.statusCode >= 500 && error?.statusCode < 600)) return 'server';
  return 'generic';
}
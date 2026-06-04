export class ApiError extends Error {
  constructor({ message, status, errors = [], data = null, response = null }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.data = data;
    this.response = response;
  }
}

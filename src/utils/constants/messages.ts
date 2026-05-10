export const Messages = {
  ALREADY_EXIST: 'already exists',
  NOT_FOUND: 'Resource not found',

  // Payment messages
  PAYMENT_CREATED: 'Payment initiated successfully',
  PAYMENT_FOUND: 'Payment retrieved successfully',
  PAYMENTS_FOUND: 'Payments retrieved successfully',
  PAYMENT_NOT_FOUND: 'Payment not found',
  PAYMENT_DUPLICATE:
    'A payment with this idempotency key already exists. Returning the existing record.',
  PAYMENT_INVALID_TRANSITION:
    'Invalid status transition for the current payment state',
  PAYMENT_ALREADY_TERMINAL:
    'Payment is already in a terminal state and cannot be updated',

  // Webhook messages
  WEBHOOK_RECEIVED: 'Webhook received and processed successfully',
  WEBHOOK_DUPLICATE: 'Duplicate webhook event — already processed',
  WEBHOOK_INVALID_PAYLOAD: 'Webhook payload is invalid or missing required fields',

  // Gateway messages
  GATEWAY_SUCCESS: 'Payment processed by gateway',
  GATEWAY_TIMEOUT: 'Gateway request timed out',
  GATEWAY_FAILURE: 'Gateway returned a failure response',

  // Queue messages
  QUEUE_JOB_ENQUEUED: 'Payment job enqueued for processing',
  QUEUE_JOB_FAILED: 'Payment job failed after maximum retry attempts',
  QUEUE_JOB_RETRY: 'Payment job scheduled for retry',
};

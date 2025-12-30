import { EmailError } from "./base";

export class OutboxConnectionError extends EmailError {}
export class OutboxAuthError extends EmailError {}
export class OutboxSendError extends EmailError {}
export class OutboxProtocolError extends EmailError {}
export class OutboxStateError extends EmailError {}

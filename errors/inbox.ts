import { EmailError } from "./base";

export class InboxConnectionError extends EmailError {}
export class InboxAuthError extends EmailError {}
export class InboxProtocolError extends EmailError {}
export class InboxStateError extends EmailError {}
export class InboxDeleteError extends EmailError {}

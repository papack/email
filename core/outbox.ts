import nodemailer, { type Transporter } from "nodemailer";
import {
  OutboxConnectionError,
  OutboxSendError,
  OutboxStateError,
} from "../errors/outbox";
import { render } from "../jsx/render";
import type { VNodeLike } from "../jsx/jsx";
import type { Attachment } from "./attachment";
import { Readable } from "nodemailer/lib/xoauth2";

type OutboxSendInput = {
  to: string[];
  cc: string[];
  bcc: string[];
  attachments: Attachment[];
  subject: string;
  content: VNodeLike; // JSX
};

type OutboxConfig = {
  from: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  onError: (error: Error) => Promise<void>;
};

type State = "connected" | "disconnected";

export class Outbox {
  private state: State = "disconnected";
  private transporter: Transporter | null = null;

  constructor(private readonly config: OutboxConfig) {
    if (typeof config.onError !== "function") {
      throw new OutboxStateError("onError must be provided");
    }
  }

  async connect(): Promise<void> {
    if (this.state === "connected") {
      throw new OutboxStateError("Outbox is already connected");
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },

        // Pflicht: Timeouts, damit verify/send nicht hängen
        connectionTimeout: 30_000, // TCP connect
        greetingTimeout: 30_000, // SMTP banner
        socketTimeout: 30_000, // TLS / idle
      });

      await this.transporter.verify();
      this.state = "connected";
    } catch (err) {
      const error =
        err instanceof Error
          ? new OutboxConnectionError("Failed to connect to SMTP server", err)
          : new OutboxConnectionError("Failed to connect to SMTP server");

      await this.config.onError(error);
      this.transporter = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.state === "connected" && this.transporter) {
      try {
        this.transporter.close();
      } finally {
        this.transporter = null;
        this.state = "disconnected";
      }
    }
  }

  async send(input: OutboxSendInput): Promise<void> {
    if (this.state !== "connected" || !this.transporter) {
      throw new OutboxStateError("Outbox is not connected");
    }

    try {
      const { html, text } = await render(input.content);

      await this.transporter.sendMail({
        from: this.config.from,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        html,
        text,
        attachments: input.attachments.map((a) => ({
          filename: a.filename,
          content: a.buffer as Readable,
          contentType: a.contentType,
        })),
      });
    } catch (err) {
      const error =
        err instanceof Error
          ? new OutboxSendError("Failed to send email", err)
          : new OutboxSendError("Failed to send email");

      await this.config.onError(error);
      await this.disconnect();
      throw error;
    }
  }
}

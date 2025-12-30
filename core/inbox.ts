import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import {
  InboxConnectionError,
  InboxDeleteError,
  InboxProtocolError,
  InboxStateError,
} from "../errors/inbox";
import type { Attachment } from "./attachment";

export type Mail = {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: {
    text: string;
    html: string;
  };
  attachments: Attachment[];
  date?: string;
  receivedAt: string;
};

export type InboxStatus = {
  connected: boolean;
  total: number;
  unread: number;
  read: number;
};

export type InboxConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  onError: (error: Error) => Promise<void>;
};

type State = "connected" | "disconnected";

export class Inbox {
  private state: State = "disconnected";
  private client: ImapFlow | null = null;

  constructor(private readonly config: InboxConfig) {
    if (typeof config.onError !== "function") {
      throw new InboxStateError("onError must be provided");
    }
  }

  async connect(): Promise<void> {
    if (this.state === "connected") {
      throw new InboxStateError("Inbox is already connected");
    }

    try {
      this.client = new ImapFlow({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
      });

      await this.client.connect();
      await this.client.mailboxOpen("INBOX");

      if (!this.client.mailbox) {
        throw new InboxProtocolError("Mailbox not available");
      }

      this.state = "connected";
    } catch (err) {
      const error =
        err instanceof Error
          ? new InboxConnectionError("Failed to connect to IMAP server", err)
          : new InboxConnectionError("Failed to connect to IMAP server");

      await this.config.onError(error);
      this.client = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.logout();
      } finally {
        this.client = null;
        this.state = "disconnected";
      }
    }
  }

  async status(): Promise<InboxStatus> {
    if (this.state !== "connected" || !this.client) {
      throw new InboxStateError("Inbox is not connected");
    }

    const mailbox = this.client.mailbox;
    if (!mailbox) {
      throw new InboxStateError("Mailbox is not open");
    }

    try {
      const result = await this.client.search({ seen: false });
      const unread = Array.isArray(result) ? result.length : 0;

      const total = mailbox.exists;
      const read = total - unread;

      return {
        connected: true,
        total,
        unread,
        read,
      };
    } catch (err) {
      const error =
        err instanceof Error
          ? new InboxProtocolError("Failed to read inbox status", err)
          : new InboxProtocolError("Failed to read inbox status");

      await this.config.onError(error);
      await this.disconnect();
      throw error;
    }
  }

  async recv(): Promise<Mail | null> {
    if (this.state !== "connected" || !this.client) {
      throw new InboxStateError("Inbox is not connected");
    }

    try {
      const result = await this.client.search({ seen: false });
      if (!Array.isArray(result) || result.length === 0) {
        return null;
      }

      const uid = Math.min(...result);

      const msg = await this.client.fetchOne(uid, {
        uid: true,
        source: true,
        internalDate: true,
      });

      if (!msg || !msg.source || !msg.internalDate) {
        return null;
      }

      const parsed = await simpleParser(msg.source);

      const from =
        typeof parsed.from === "object" && parsed.from?.text
          ? parsed.from.text
          : "";

      const to: string[] = [];
      if (parsed.to) {
        const list = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
        for (const entry of list) {
          for (const addr of entry.value) {
            if (addr.address) {
              to.push(addr.address);
            }
          }
        }
      }

      const subject = typeof parsed.subject === "string" ? parsed.subject : "";

      const text = typeof parsed.text === "string" ? parsed.text : "";
      const html = typeof parsed.html === "string" ? parsed.html : "";

      const attachments: Attachment[] = Array.isArray(parsed.attachments)
        ? parsed.attachments.map((a) => ({
            buffer: a.content as Buffer,
            filename: a.filename ?? "attachment",
            contentType: a.contentType,
          }))
        : [];

      const date =
        parsed.date instanceof Date ? parsed.date.toISOString() : undefined;

      return {
        id: String(uid),
        from,
        to,
        subject,
        body: { text, html },
        attachments,
        date,
        receivedAt: new Date(msg.internalDate).toISOString(),
      };
    } catch (err) {
      const error =
        err instanceof Error
          ? new InboxProtocolError("Failed to receive email", err)
          : new InboxProtocolError("Failed to receive email");

      await this.config.onError(error);
      await this.disconnect();
      throw error;
    }
  }

  async read(id: string): Promise<void> {
    if (this.state !== "connected" || !this.client) {
      throw new InboxStateError("Inbox is not connected");
    }

    try {
      await this.client.messageFlagsAdd(Number(id), ["\\Seen"], { uid: true });
    } catch (err) {
      const error =
        err instanceof Error
          ? new InboxProtocolError("Failed to mark email as read", err)
          : new InboxProtocolError("Failed to mark email as read");

      await this.config.onError(error);
      await this.disconnect();
      throw error;
    }
  }

  async delete(input: { hours: number }): Promise<void> {
    if (this.state !== "connected" || !this.client) {
      throw new InboxStateError("Inbox is not connected");
    }

    try {
      const before = new Date(Date.now() - input.hours * 3600 * 1000);

      const result = await this.client.search({
        seen: true,
        before,
      });

      if (!Array.isArray(result) || result.length === 0) {
        return;
      }

      await this.client.messageDelete(result, { uid: true });
    } catch (err) {
      const error =
        err instanceof Error
          ? new InboxDeleteError("Failed to delete emails", err)
          : new InboxDeleteError("Failed to delete emails");

      await this.config.onError(error);
      await this.disconnect();
      throw error;
    }
  }
}

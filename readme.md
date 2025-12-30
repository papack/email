# @papack/email

Minimal API for **sending emails (Outbox)** and **receiving emails (Inbox)**.
Based on **ImapFlow** and **nodemailer**.

## Installation

```bash
npm install @papack/email
```

```ts
import { Inbox, Outbox } from "@papack/email";
```

Inbox and Outbox are logically and technically separated.

## Outbox

API for sending emails.
One account = one Outbox.

### Outbox – Initialization

```ts
const outbox = new Outbox({
  from: "My App <a@test.com>",
  host: "smtp.test.com",
  port: 587,
  secure: false,
  user: "a@test.com",
  pass: "secret",

  onError: async (error) => {
    // mandatory error handling
  },
});
```

#### `onError` is mandatory

- Must be async
- Called for **all internal errors**
- If an error is not handled, the connection is immediately closed

Possible errors (selection):

- `OutboxConnectionError`
- `OutboxAuthError`
- `OutboxSendError`
- `OutboxProtocolError`
- `OutboxStateError`

### Outbox – Connection

#### connect

```ts
await outbox.connect();
```

#### disconnect

```ts
await outbox.disconnect();
```

- A connection is meant for **one send batch**
- No persistent connections

### Send Email

```ts
await outbox.send({
  to: ["b@test.com"],
  cc: [],
  bcc: [],
  attachments: [],
  subject: "Hi",
  content: <p>Hello</p>,
});
```

- Only allowed in `connected` state

### Attachment

```ts
type Attachment = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};
```

## Inbox

API for fetching, marking, and cleaning up emails.
One account = one Inbox.

Works **only on the primary inbox**
(IMAP INBOX, Gmail INBOX).

### Inbox – Initialization

```ts
const inbox = new Inbox({
  host: "imap.test.com",
  port: 993,
  secure: true,
  user: "a@test.com",
  pass: "secret",

  onError: async (error) => {
    // mandatory error handling
  },
});
```

#### `onError` is mandatory

- Must be async
- Called for **all internal errors**
- If an error is not handled, the connection is immediately closed

Possible errors (selection):

- `InboxConnectionError`
- `InboxAuthError`
- `InboxProtocolError`
- `InboxStateError`
- `InboxDeleteError`

Initialization does **not** open a connection.
Configuration only.

All options are flat.
No nesting. No provider-specific extras.

### Inbox – Connection

#### connect

```ts
await inbox.connect();
```

#### disconnect

```ts
await inbox.disconnect();
```

---

### Inbox – Status

```ts
const status = await inbox.status();
```

```ts
type InboxStatus = {
  connected: boolean;
  total: number;
  unread: number;
  read: number;
};
```

---

### Receive Email (`recv`)

```ts
const mail = await inbox.recv();
```

- Fetches the **oldest unread email**
- Ordered by server arrival time
- No state changes
- No mail → `null`

---

### Mark Email as Read (`read`)

```ts
await inbox.read(mail.id);
```

- Marks the email as read
- Does not re-fetch content
- No return value

### Delete Old Emails (`delete`)

```ts
await inbox.delete({ hours: 48 });
```

- Deletes **read emails only**
- Deletes all read emails older than the given number of hours
- Based on server arrival time
- Permanent deletion (provider-dependent)

### Mail Type

```ts
type Mail = {
  id: string;

  from: string;
  to: string[];

  subject: string;

  body: {
    text: string;
    html: string;
  };

  attachments: Attachment[]; // always an array

  date?: string; // header date (informational)
  receivedAt: string; // server time (authoritative, ISO-8601)
};
```

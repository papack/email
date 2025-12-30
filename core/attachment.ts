export type Attachment = {
  buffer: NodeJS.ReadableStream | Buffer;
  filename: string;
  contentType: string;
};

import type { Server, Socket } from 'socket.io';

import type { TransferCompletedEvent } from '@app/common';

export interface WelcomePayload {
  message: string;
}

export type NotificationPayload = { message: string } | TransferCompletedEvent;

export interface ServerToClientEvents {
  welcome: (payload: WelcomePayload) => void;
  notification: (payload: NotificationPayload) => void;
}

export interface HelloPayload {
  name: string;
}

export type HelloAcknowledgement =
  { ok: true; message: string } | { ok: false; error: string };

export interface ClientToServerEvents {
  hello: (
    payload: HelloPayload,
    acknowledge: (response: HelloAcknowledgement) => void,
  ) => void;
}

export interface NotificationSocketData {
  userId: number;
}

export type NotificationServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  NotificationSocketData
>;

export type NotificationSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  NotificationSocketData
>;

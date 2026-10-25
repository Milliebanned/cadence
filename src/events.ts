import type { MerchantEvent } from "./merchant.ts";

export interface LoggedEvent extends MerchantEvent {
  webhook?: { status: "sent" | "failed"; code?: number; error?: string };
}

/** Recent merchant events for the dashboard, newest first, kept in memory. */
export class EventLog {
  private readonly max: number;
  private readonly items: LoggedEvent[] = [];

  constructor(max = 200) {
    this.max = max;
  }

  push(e: MerchantEvent): LoggedEvent {
    const item: LoggedEvent = { ...e };
    this.items.unshift(item);
    if (this.items.length > this.max) this.items.pop();
    return item;
  }

  list(limit = 50): LoggedEvent[] {
    return this.items.slice(0, limit);
  }
}

import { randomInt } from "node:crypto";
import type { Mandate } from "./types.ts";
import { dueAtForCycle } from "./mandate.ts";

/** A send time inside [due, due + jitterSec], drawn from a CSPRNG, so renewals
 *  do not land on a fixed second that an observer could line up across payers. */
export function pickSendTime(
  mandate: Mandate,
  cycle: number,
  rand: (maxExclusive: number) => number = (n) => randomInt(n),
): number {
  const due = dueAtForCycle(mandate, cycle);
  const window = Math.min(mandate.jitterSec, mandate.graceSec);
  return due + (window > 0 ? rand(window + 1) : 0);
}

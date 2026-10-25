import { closeSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** One agent per data directory: two processes paying from the same state could both pay a cycle. */
export function acquireLock(path: string): () => void {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(path, "wx");
      writeSync(fd, String(process.pid));
      closeSync(fd);
      const release = () => {
        try {
          if (readFileSync(path, "utf8") === String(process.pid)) unlinkSync(path);
        } catch {}
      };
      process.once("exit", release);
      for (const sig of ["SIGINT", "SIGTERM"] as const) process.once(sig, () => process.exit(0));
      return release;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      const pid = Number(readFileSync(path, "utf8"));
      if (Number.isInteger(pid) && pid > 0 && alive(pid)) throw new Error(`another agent (pid ${pid}) is already running on this data directory`);
      unlinkSync(path); // stale lock from a process that is gone
    }
  }
  throw new Error("could not take the agent lock");
}

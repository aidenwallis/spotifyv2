export interface StateTask {
  action(): void;
  delay: number;
}

export class StateQueue {
  private tasks: StateTask[] = [];
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  public push(...tasks: StateTask[]) {
    this.tasks.push(...tasks);
    !this.running && this.run();
  }

  public close() {
    this.timeout && clearTimeout(this.timeout);
  }

  private async run() {
    this.running = true;

    while (this.tasks.length) {
      const task = this.tasks.shift();
      if (!task) {
        break;
      }

      task.action();
      await this.await(task.delay);
    }

    this.running = false;
  }

  private await(delay: number) {
    this.timeout && clearTimeout(this.timeout);
    return new Promise<void>((resolve) => {
      this.timeout = setTimeout(() => {
        resolve();
        this.timeout = null;
      }, delay);
    });
  }
}

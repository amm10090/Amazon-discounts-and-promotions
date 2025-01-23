import chalk from 'chalk';

export class Logger {
  private static readonly PREFIX = {
    INFO: chalk.blue('ℹ'),
    SUCCESS: chalk.green('✓'),
    WARNING: chalk.yellow('⚠'),
    ERROR: chalk.red('✖'),
    DEBUG: chalk.gray('🔍'),
    PROGRESS: chalk.cyan('↻')
  };

  private static formatTime(): string {
    return chalk.gray(new Date().toLocaleTimeString());
  }

  private static progressBar(current: number, total: number, width: number = 30): string {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((width * current) / total);
    const empty = width - filled;
    const filledBar = chalk.green('█').repeat(filled);
    const emptyBar = chalk.gray('█').repeat(empty);
    return `${filledBar}${emptyBar} ${chalk.yellow(percentage)}%`;
  }

  static info(message: string): void {
    console.log(`${this.PREFIX.INFO} ${this.formatTime()} ${message}`);
  }

  static success(message: string): void {
    console.log(`${this.PREFIX.SUCCESS} ${this.formatTime()} ${chalk.green(message)}`);
  }

  static warning(message: string): void {
    console.log(`${this.PREFIX.WARNING} ${this.formatTime()} ${chalk.yellow(message)}`);
  }

  static error(message: string): void {
    console.log(`${this.PREFIX.ERROR} ${this.formatTime()} ${chalk.red(message)}`);
  }

  static debug(message: string): void {
    console.log(`${this.PREFIX.DEBUG} ${this.formatTime()} ${chalk.gray(message)}`);
  }

  static progress(current: number, total: number, message: string): void {
    const bar = this.progressBar(current, total);
    console.log(`${this.PREFIX.PROGRESS} ${this.formatTime()} ${message}\n   ${bar} (${current}/${total})`);
  }

  static divider(): void {
    console.log(chalk.gray('─'.repeat(80)));
  }

  static summary(title: string, data: Record<string, any>): void {
    console.log(`\n${chalk.bold.blue('📊 ' + title)}`);
    this.divider();
    Object.entries(data).forEach(([key, value]) => {
      console.log(`${chalk.blue(key.padEnd(20))}: ${value}`);
    });
    this.divider();
  }

  static asinSample(asins: string[], count: number = 10): void {
    console.log(`\n${chalk.bold.blue('📋 ASIN样本')} ${chalk.gray(`(前${count}个)`)}`);
    this.divider();
    asins.slice(0, count).forEach((asin, index) => {
      console.log(`${chalk.gray((index + 1).toString().padStart(2, '0'))} ${chalk.cyan(asin)}`);
    });
    this.divider();
  }
} 
import { JapanRunner } from 'Crawler/392/JapanRunner';

export abstract class PrefectureRunner extends JapanRunner {
  protected getLocalCodes(): string[] {
    return ['Prefecture'];
  }

  getIndexInterval(): number {
     return (30 * 60);
  }

  getActivateInterval(): number {
     return (15 * 60);
  }
}

import { JapanRunner } from 'Crawler/392/JapanRunner';

export abstract class MlitRunner extends JapanRunner {

  protected getLocalCodes(): string[] {
    return ['MLIT'];
  }
}

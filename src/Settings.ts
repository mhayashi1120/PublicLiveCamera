import * as path from 'path';

const RootDirectory = (() => {
  const dir = process.cwd();

  const pkgFile = path.join(dir, 'package.json');
  try {
    const pkgJson = require(pkgFile);

    if (pkgJson['name'] !== '@mhayashi1120/public-live-camera') {
      throw new Error(`Failed locate package.`);
    }

    return dir;
  } catch (err) {
    console.error(`Failed load settings`);
    throw err;
  }
})();

export const CacheDirectoryName = '__cache__';
export const PubDirectoryName = 'docs';
export const TemplateDirectoryName = 'template';
export const ScheduleQueueDirectoryName = 'queue';
export const PubDirectory = path.join(RootDirectory, PubDirectoryName);
export const MasterDirectory = path.join(RootDirectory, 'master');
export const TemplateDirectory = path.join(RootDirectory, TemplateDirectoryName);
export const PubVersionFile = path.join(PubDirectory, 'version.json');
export const CacheDirectory = path.join(RootDirectory, CacheDirectoryName);
export const SourceDirectory = path.join(RootDirectory, 'src');
export const CrawlerScriptDirectory = path.join(SourceDirectory, 'Crawler');
export const CrawlDataDirectory = path.join(CacheDirectory, 'crawldata');
export const CrawlDataIndexDirectory = path.join(CacheDirectory, 'crawlindex');
export const GeoLocationDirectory = path.join(CacheDirectory, 'geoindex');
export const ScheduleQueueDirectory = path.join(RootDirectory, ScheduleQueueDirectoryName);
export const ThumbResourceName = 'thumb';
export const IndexResourceName = 'index';
export const PubThumbDirectory = path.join(PubDirectory, ThumbResourceName);
export const GithubWorkflowDirectory = path.join(RootDirectory, '.github/workflows');

export const SpecDirectory = path.join(RootDirectory, '__tests__');

export function getIndexRootDirectory(): string {
  return path.join(PubDirectory, IndexResourceName);
}

// Generate Thumbnail location prefix directory as in UTC timezone
export function getThumbPrefix(date: Date): string {
  const offsetMin = date.getTimezoneOffset();
  const offsetMS = offsetMin * 60 * 1000;
  const d = new Date(date.getTime() - offsetMS);
  const yearStr = d.getFullYear().toString();
  const monthStr = (d.getMonth() + 1).toString();
  const dayStr = d.getDate().toString();

  const yyyyMMdd = `${yearStr.padStart(4, '0')}${monthStr.padStart(2, '0')}${dayStr.padStart(2, '0')}`;

  return yyyyMMdd;
}

export function getIndexRootResource(key: string): string {
  return `${IndexResourceName}/${key}`
}

export function getThumbRootResource2(key: string): string {
  return `${ThumbResourceName}/${key}`
}

export function getDailyThumbResource(targetPath: string, date: Date): string {
  const yyyyMMdd = getThumbPrefix(date);

  return `${targetPath}/${yyyyMMdd}`;
}

export function getThumbResource2(key: string, date: Date): string {
  const yyyyMMdd = getThumbPrefix(date);

  return `${getThumbRootResource2(key)}/${yyyyMMdd}`;
}

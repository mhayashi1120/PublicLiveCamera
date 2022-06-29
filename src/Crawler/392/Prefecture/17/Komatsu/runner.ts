import { PrefectureRunner } from 'Crawler/392/PrefectureRunner';

import { CanonVBC60, generateLocation, } from 'CameraTools';
import { } from 'Logging';

export class Runner extends PrefectureRunner {
  public readonly LocalCodes = this.getLocalCodes();

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['17', 'Komatsu']);
  }

  getIndexInterval(): number {
     return (13 * 60);
  }

  public getFriendlyName(): string {
    return '小松市ライブカメラ';
  }

  public run(): void {

    // Seems to use canon VB-C60
    const database: CanonVBC60[] = [
      {
        lat: 36.408214,
        lng: 136.445684,
        title: '小松空港',
        indexUrl: 'http://www.camera1.citykomatsu.jp/local/live.html',
        openUrl: 'http://www.camera1.citykomatsu.jp/-wvhttp-01-/open.cgi',
        imageUrlPrefix: 'http://www.camera1.citykomatsu.jp/-wvhttp-01-/GetLiveImage',
        parameterName: 'connection_id',
      },
      {
        lat: 36.369081,
        lng: 136.443408,
        title: '木場潟',
        indexUrl: 'http://www.camera7.citykomatsu.jp/viewer/live/index.html',
        openUrl: 'http://www.camera7.citykomatsu.jp/-wvhttp-01-/open.cgi',
        imageUrlPrefix: 'http://www.camera7.citykomatsu.jp/-wvhttp-01-/image.cgi',
        parameterName: 's',
      },
      {
        lat: 36.419241,
        lng: 136.416999,
        title: '安宅の関',
        indexUrl: 'http://www.camera3.citykomatsu.jp/local/live.html',
        openUrl: 'http://www.camera3.citykomatsu.jp/-wvhttp-01-/open.cgi',
        imageUrlPrefix: 'http://www.camera3.citykomatsu.jp/-wvhttp-01-/GetLiveImage',
        parameterName: 'connection_id',
      },
      {
        lat: 36.311689,
        lng: 136.420440,
        title: '那谷寺',
        indexUrl: 'http://www.camera2.citykomatsu.jp/local/live.html',
        openUrl: 'http://www.camera2.citykomatsu.jp/-wvhttp-01-/open.cgi',
        imageUrlPrefix: 'http://www.camera2.citykomatsu.jp/-wvhttp-01-/GetLiveImage',
        parameterName: 'connection_id',
      },
      {
        lat: 36.408278,
        lng: 136.457998,
        title: '小松消防本部',
        indexUrl: 'http://www.camera4.citykomatsu.jp/viewer/live/ja/live.html',
        openUrl: 'http://www.camera4.citykomatsu.jp/-wvhttp-01-/open.cgi',
        imageUrlPrefix: 'http://www.camera4.citykomatsu.jp/-wvhttp-01-/GetLiveImage',
        parameterName: 'connection_id',
      },
    ];

    const json = generateLocation(database);

    for (const cameraItem of json) {
      super.writeCrawlJson(cameraItem);
    }
  }

}

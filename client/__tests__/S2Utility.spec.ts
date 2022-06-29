import * as u3 from '../src/S2Utility3';
import { S2 } from 's2-geometry';

describe('Simple case', () => {
  test('splitSegment() simple text', () => {
    // key is '2/333011231203021220121012101122'
    // id is '6884715635621284021'
    const lat = 38.170865986477686;
    const lng = 139.5070213552617;

    expect(u3.splitSegment('2/333011231203021220121012101122')).toStrictEqual(['2', '333', '011', '231', '203','021', '220', '121', '012', '101', '122']);
    expect(u3.splitSegment('2/33301123120302122012101210112')).toStrictEqual(['2', '333', '011', '231', '203','021', '220', '121', '012', '101', '12']);
    expect(u3.splitSegment('2/3330112312030212201210121011')).toStrictEqual(['2', '333', '011', '231', '203','021', '220', '121', '012', '101', '1']);
    expect(u3.splitSegment('2/3')).toStrictEqual(['2', '3']);
    // TODO how to handle it. More consideration
    // expect(u.splitSegment('2')).toStrictEqual(['2']);

    for (let level = 1; level <= 30; level++) {
      const key = S2.latLngToKey(lat, lng, level);
      const id = S2.keyToId(key);
      const result = u3.splitSegment(key);

      // Just test working properly
      console.log(`${lat},${lng} ${level} ${key} ${id} -> segment: ${result}`);
    }
  });

  test('test ambient typings', () => {
    const c: S2.S2Cell = S2.S2Cell.FromHilbertQuadKey('2/1');
    const l: S2.L.LatLng = S2.idToLatLng('1');

    console.log(c, l);
  });

  test('getSegmentList() simple text', () => {

    const cases = [
      {args: [38.170865986477686,139.5070213552617,38.17023338105416,139.50553272925845], maplevel: 20},
      {args: [38.1695891659448,139.5050999089442,38.168956549439514,139.50361128294094], maplevel: 20},
      {args: [38.16519065703088,139.49936452847123,38.164558002352564,139.49787590246797], maplevel: 20},
      {args: [38.22679375375755,139.57002124522865,38.21667917926429,139.5462032291764], maplevel: 16},
      {args: [38.17679504765526,139.51681462478473,38.16667352541368,139.49299660873248], maplevel: 16},
      {args: [39.234543518719235,141.4287836621004,39.074807051414616,141.04769540526445], maplevel: 12},
      {args: [39.15028396976289,141.32851629776565,38.99035618009155,140.9474280409297], maplevel: 12},
      {args: [38.740133862748586,139.6733214861838,38.57927973727083,139.29223322934786], maplevel: 12},
      {args: [38.31493299493088,139.70585886841536,38.15312727303753,139.32477061157942], maplevel: 12},
      {args: [37.111069355095026,137.5752795136719,36.45113198792587,136.05092648632814], maplevel: 10},
      {args: [36.30436801352499,137.3675341513613,35.63752075977117,135.84318112401755], maplevel: 10},
      {args: [35.36093455019809,136.2615418129076,34.6861761509679,134.73718878556386], maplevel: 10},
      {args: [34.55808594751398,135.7954729119583,33.87674107353905,134.27111988461456], maplevel: 10},
      {args: [33.69107628260391,134.35138789214008,33.00277067907135,132.82703486479633], maplevel: 10},
      {args: [37.66738932626962,138.7967309097182,32.26958102572216,126.60190669096819], maplevel: 7},
      {args: [37.0296960353748,127.81795261899939,31.588776452331352,115.62312840024939], maplevel: 7},
      {args: [48.99968531610447,131.57576558501756,44.48632101580933,119.38094136626756], maplevel: 7},
      {args: [43.97629867878694,98.63552927490528,39.044024097153454,86.44070505615528], maplevel: 7},
      {args: [46.486454689233256,74.73673704772489,41.75837821255538,62.541912828974894], maplevel: 7},
      {args: [61.24565409653357,61.386583094135844,24.480625165502307,-36.17201065586415], maplevel: 4},
      {args: [32.42417232633585,70.79087996913584,-18.11697007788206,-26.76771378086415], maplevel: 4},
      {args: [47.825909828564626,-85.89007712456029,1.8643701909310266,176.55132912543974], maplevel: 4},
      {args: [79.11005816065281,180,-60.400859011737225,-180], maplevel: 2},
      {args: [76.78971188162099,180,-65.46005795313799,-180], maplevel: 2},
      {args: [89.94004570786197,180,-89.91190105807063,-180], maplevel: 0},
      {args: [89.78450861973391,180,-89.97548901997473,-180], maplevel: 0},
    ];

    for (const c of cases) {
      const result = u3.getSegmentList(c.args[0], c.args[1], c.args[2], c.args[3]);

      const paths = result.map(r => r.join('/'));
      // TODO currently specification is not fixed. more test.
      console.log(`Map Zoom: ${c.maplevel} -> ${paths}`);
    }
  });

  test('segment comparer', () => {
    expect(u3.segmentsEquals(['1'], ['1'])).toBe(true);
    expect(u3.segmentsEquals(['1', '334'], ['1', '334'])).toBe(true);
    expect(u3.segmentsEquals(['1'], ['1', '334'])).toBe(false);
    expect(u3.segmentsEquals(['2'], ['1', '334'])).toBe(false);

    expect(u3.segmentsIsAncestor(['1'], ['1', '333'])).toBe(true);
    expect(u3.segmentsIsAncestor(['1'], ['2', '333'])).toBe(false);
    expect(u3.segmentsIsAncestor(['1'], ['1'])).toBe(false);
    expect(u3.segmentsIsAncestor(['1'], ['2'])).toBe(false);

    expect(u3.segmentsIsDescendant(['1', '333'], ['1'])).toBe(true);
    expect(u3.segmentsIsDescendant(['2', '333'], ['1'])).toBe(false);
    expect(u3.segmentsIsDescendant(['1'], ['1'])).toBe(false);
    expect(u3.segmentsIsDescendant(['1'], ['2'])).toBe(false);
  });

  test('typings', () => {
    // console.log('TODO', S2NS);
    console.log(new S2.L.LatLng(1, 2, true));
  });
});

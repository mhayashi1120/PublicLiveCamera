# Design

- **百聞は一見に如かず**
- 著作権を謳っている行政サイトも散見されるため高画質画像の提供はしない。
- このサイトで配布する情報は転載ではなくサムネイル化した **引用** である。
- 道路周辺のライブカメラを中心に収集するが、河川周辺、山間部、火山活動のライブカメラも集める。
- 情報の提供意図はリアルタイムなライブカメラによる現況確認のサポート。
- 公共性、公益性が高い団体のサイトを対象とする。 **私企業が提供するものは対象としない**
- バージョンの方針、ガイドライン [semver](https://semver.org/lang/ja/) に準じる。
- Crawl 時、サーバアクセスに失敗しても基本的に retry しない。
- Crawl 時、同一サーバへの並列アクセスはしない。
- S2 library により静的に生成して利用できる情報のみを対象とする。

# Features and Terms

1. `Indexing` on Github Action to create `__cache__/crawldata` and `__cache__/crawlindex` directory (Unit with each site)
2. `Shaking` (Check duplication) on `__cache__/crawldata` directory
3. `Activate` thumbnails and index
4. `Publish` build `public` directory tree
5. `Expire` published data that is inactivated.
6. `Scheduler` invoke each command on Github Action.
7. Using [S2](https://s2geometry.io/) library.
8. Typings and Accessor to the repository Tree data.

## Indexing

1. create crawldata (just create data on /\_\_cache\_\_/crawldata/:LocalPath: directory)
2. pull to sync  (maybe other crawler process is working)
3. commit 
4. push (ignore if rejected -> next schedule will be fine!)

## Shaking

TODO Some of camera is duplicated straddle Multiple organizations.
`duplicated` means:

- Near the distance.
- Same camera image. (url ? or can have same md5? at one time.)

## Activation

Consideration:

- download image and check the size
- if large image, then truncate by imagemagick. and point to the image on github server.
- if late response, then cache the image. and point to the image on github server.
- TODO delete entry if failed to download? or continuous failed? proceeding failed download then delete?

## Publish

Consideration:

1. read commits and crawldata files from previous commit. (tag: Build-:yyyyMMddHHMMSS:)
2. create tree (just change /data directory)
3. commit
4. pull --rebase
5. push

## Expire

TODO
Expire inactive data.

TODO consider to squash thumb data

## Scheduler

TODO rough scheduler

RootTask 1:1  Github Action workflow

## S2

Each level distance statistics
 -> https://s2geometry.io/resources/s2cell_statistics

## Directory structure

Directory sturucture plan.

### crawldata

- /:CountryCode:
- /:CountryCode:/:PrefectureCode:/
- /:CountryCode:/:PrefectureCode:/:DetailedCode:

- LocalizeCode (e.g. :CountryCode:-:PrefectureCode:
- LocalPath (e.g. :CountryCode:/:PrefectureCode:)

crawl data repository
crawl app path
working directory



### master

**Country Code**

Currently just consider about Prefecture level Live camera, but should be handle more detailed local governments one.
can add data manually. not just crawling.
Just need lat,lng and image active url. Opptionally direction of camera. Point name.
Url will be deactivated after 40* or 50* http error several times.


# Maintenance

This repository under npm package.
TODO about `make` tool as high level interface of maintenance

S2 Cell


Maintainer can remove wrong entry by:

```
npm run purge-data-entry -- 6915477210142526261 6918252186286899493
```


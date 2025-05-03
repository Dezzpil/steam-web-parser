import { findAppUrl } from './db';
import { TopSellerGrabber } from '../workers/topsellerGrabber';
import { TaskType } from './task';

export async function createFilteredTopSellerAppUrls(
  topSellerGrabber: TopSellerGrabber,
  scroll = false,
) {
  const urls = scroll
    ? await topSellerGrabber.scrollAndGrabUrlsAfter()
    : await topSellerGrabber.grabUrls();
  const message = scroll
    ? `scrolled to next top sellers: ${urls.length}`
    : `initial top sellers: ${urls.length}`;
  console.log(message);

  const newUrls: TaskType[] = [];
  for (const url of urls) {
    try {
      await findAppUrl(url.appId, false);
    } catch (e) {
      console.log(`keep to process ${url.appId}: ${url.href}`);
      newUrls.push(url);
    }
  }
  return newUrls;
}

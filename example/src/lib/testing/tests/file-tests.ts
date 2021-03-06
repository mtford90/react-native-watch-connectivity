import {IntegrationTest} from '../IntegrationTest';

import fs from 'react-native-fs';
import {
  getFileTransfers,
  startFileTransfer,
  watchEvents,
} from 'react-native-watch-connectivity';
import {TestFnOpts} from './index';
import {UnsubscribeFn} from 'react-native-watch-connectivity/events';

export class FileIntegrationTest extends IntegrationTest {
  constructor() {
    super('Files');
    this.registerTest('Send file', 'reachable', this.testSendFile);
    this.registerTest(
      'Get file transfers',
      'reachable',
      this.testGetFileTransfers,
    );
  }

  testSendFile = ({log, after}: TestFnOpts) => {
    return new Promise((resolve, reject) => {
      let path = 'file://' + fs.MainBundlePath + '/Blah_Blah_Blah.jpg';

      log('transferring file: ' + path);

      let didReceiveStartEvent = false;
      let didReceiveFinalProgressEvent = false;
      let didReceiveSuccessEvent = false;

      let unsubscribeFromFileTransfers: UnsubscribeFn = () => {};

      after(() => unsubscribeFromFileTransfers());

      unsubscribeFromFileTransfers = watchEvents.addListener(
        'file',
        (event) => {
          log('transfer event: ' + JSON.stringify(event));
          if (event.type === 'started') {
            didReceiveStartEvent = true;
          } else if (
            event.type === 'progress' &&
            event.fractionCompleted === 1
          ) {
            didReceiveFinalProgressEvent = true;
          } else if (event.type === 'finished') {
            didReceiveSuccessEvent = true;
          }

          if (
            didReceiveStartEvent &&
            didReceiveFinalProgressEvent &&
            didReceiveSuccessEvent
          ) {
            resolve();
            unsubscribeFromFileTransfers();
          }
        },
      );

      startFileTransfer(path).catch((err) => {
        reject(err);
      });

      log('started file transfer');
    });

    // TODO: Clean up susbcribes on test failure (need an after func)
  };

  testGetFileTransfers = async ({log}: TestFnOpts) => {
    const fileTransfers = await getFileTransfers();
    log('File transfers received: ' + JSON.stringify(fileTransfers, null, 2));
  };
}

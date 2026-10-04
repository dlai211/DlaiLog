// Global test setup for DlaiLog.
//
// AsyncStorage is replaced by the official in-memory mock that ships with the
// package. Data saved during a test survives as long as the mock module stays
// loaded — which is exactly what lets us test "add data → remount → data is
// still there" (the refresh-persistence behavior).

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { configure } from '@testing-library/react-native';
import WebSocket from 'ws';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// The Supabase client builds its realtime half in the constructor, even though
// DlaiLog never subscribes to anything, and that half insists on a WebSocket
// constructor being present. The browser and the phone both provide one; Node
// does not until version 22, so Jest is given a real implementation here.
// `ws` is a dev dependency and is never part of the app bundle.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
}

// A fresh install writes the example dataset (see store/sample-data.ts). Tests
// want the empty app they set up themselves, so the seeding is switched off
// here, once, in a way no test can accidentally undo.
process.env.EXPO_PUBLIC_DLAILOG_NO_SEED = '1';

// Likewise the cloud: the suite runs against the storage on the device rather
// than a live database. Without this, a test that opens the app would try to
// reach Supabase — slow, and dependent on a network we do not control.
// `src/store/cloud.test.ts` covers the cloud path by standing in a fake.
process.env.EXPO_PUBLIC_DLAILOG_NO_CLOUD = '1';

// The default 1s waitFor timeout is tight when many suites share a busy
// machine; waiting longer changes nothing about *what* is asserted.
configure({ asyncUtilTimeout: 5000 });

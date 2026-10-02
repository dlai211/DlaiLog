// Global test setup for DlaiLog.
//
// AsyncStorage is replaced by the official in-memory mock that ships with the
// package. Data saved during a test survives as long as the mock module stays
// loaded — which is exactly what lets us test "add data → remount → data is
// still there" (the refresh-persistence behavior).

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { configure } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// A fresh install writes the example dataset (see store/sample-data.ts). Tests
// want the empty app they set up themselves, so the seeding is switched off
// here, once, in a way no test can accidentally undo.
process.env.EXPO_PUBLIC_DLAILOG_NO_SEED = '1';

// The default 1s waitFor timeout is tight when many suites share a busy
// machine; waiting longer changes nothing about *what* is asserted.
configure({ asyncUtilTimeout: 5000 });

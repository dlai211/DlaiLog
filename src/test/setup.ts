// Global test setup for DlaiLog.
//
// AsyncStorage is replaced by the official in-memory mock that ships with the
// package. Data saved during a test survives as long as the mock module stays
// loaded — which is exactly what lets us test "add data → remount → data is
// still there" (the refresh-persistence behavior).

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { configure } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// The default 1s waitFor timeout is tight when many suites share a busy
// machine; waiting longer changes nothing about *what* is asserted.
configure({ asyncUtilTimeout: 5000 });

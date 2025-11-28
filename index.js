/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App'; // ./App.js 파일을 불러옵니다.
import {name as appName} from './app.json'; // 'rally_app'이 아니라 'name as appName'으로 가져옵니다.

// 앱 이름(appName)으로 App 컴포넌트를 등록합니다.
AppRegistry.registerComponent(appName, () => App);

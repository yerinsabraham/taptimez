// Firebase configuration for TapTimez.
// Values taken from google-services.json (Android) and GoogleService-Info.plist (iOS).
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not configured for this platform.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCtJFBZMxL5nZStwSBtP70REqVJdXVkFxo',
    appId: '1:929786167291:android:cfd553f1bc3c719fd5155e',
    messagingSenderId: '929786167291',
    projectId: 'timitiming-21d9a',
    storageBucket: 'timitiming-21d9a.firebasestorage.app',
    databaseURL: 'https://timitiming-21d9a-default-rtdb.firebaseio.com',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBXttlR2WGx9VaAK7V7QiHwFqyrns3J5dk',
    appId: '1:929786167291:ios:61f3447d9ffdcf9dd5155e',
    messagingSenderId: '929786167291',
    projectId: 'timitiming-21d9a',
    storageBucket: 'timitiming-21d9a.firebasestorage.app',
    databaseURL: 'https://timitiming-21d9a-default-rtdb.firebaseio.com',
    iosBundleId: 'com.creovine.taptimez',
  );

  // Included for completeness (matches the web app config).
  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyD1yRQuAVQj3rwPNhxd2gcZNOsLauO0tXE',
    appId: '1:929786167291:web:c0bf54b973b83bdfd5155e',
    messagingSenderId: '929786167291',
    projectId: 'timitiming-21d9a',
    authDomain: 'timitiming-21d9a.firebaseapp.com',
    storageBucket: 'timitiming-21d9a.firebasestorage.app',
    databaseURL: 'https://timitiming-21d9a-default-rtdb.firebaseio.com',
    measurementId: 'G-B1RFZ9043N',
  );
}

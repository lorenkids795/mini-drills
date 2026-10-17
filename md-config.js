// Mini Drills config. Set demo:false to use the real backend (Firebase).
// Open the site with ?demo=1 to try it with sample data (nothing is saved, no real accounts are touched).
var mdDemo = /[?&]demo(=1|=true)?(&|$)/.test(location.search);
window.MD_CONFIG = {
  demo: mdDemo,
  // Must match the TEACHERS variable in Cloudflare Pages (see README).
  teachers: ['lorenkids795@gmail.com'],
  api: '/api',
  firebase: {
    apiKey: 'AIzaSyA6cCzpbLHi1F54pJEAa2EOZFtQjkjr-mo',
    authDomain: 'mini-drills.firebaseapp.com',
    projectId: 'mini-drills',
    storageBucket: 'mini-drills.firebasestorage.app',
    messagingSenderId: '532860047599',
    appId: '1:532860047599:web:b55dfbcbd1852b984a0b1a'
  }
};

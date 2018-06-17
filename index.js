/*
    Filename:   index.js
    Author:     Samantha Emily-Rachel Belnavis
    Date:       June 16, 2018
 */

const firebase = require('firebase');
const get = require('get-value');

const firebaseConfig = {
    apiKey: "AIzaSyC02v1ERX8D1VbjJI2BDwFi7TdkEjUsh_E",
    authDomain: "cloud-d712b.firebaseapp.com",
    databaseURL: "https://cloud-d712b.firebaseio.com/",
    storageBucket: "cloud-d712b.appspot.com"
};

firebase.initializeApp(firebaseConfig);

// convert filesize to something human readable
function humanReadable(filesizeBytes) {
  var i = -1;
  var byteUnits = ['KB', 'MB', 'GB'];
  do {
      filesizeBytes = filesizeBytes / 1024;
      i++;
  } while (filesizeBytes > 1024);

  return Math.max(filesizeBytes, 0.1).toFixed(1) + byteUnits[i];
}

module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};


module.exports = release_robot => {
    release_robot.on(['release'], async context => {
        // A release was published
        release_robot.log(context);

        const releaseId = "" + get(context, 'id');
        release_robot.log(releaseId);

        const author = "" + get(context.payload, 'release.author.login');
        release_robot.log(author);

        const version = "" + get(context.payload, 'release.tag_name');
        release_robot.log(version);

        const assetName = "" + get(context.payload, 'release.assets.0.name');
        release_robot.log(assetName);

        var assetSize = "" + humanReadable(get(context.payload, 'release.assets.0.size'));
        release_robot.log(assetSize);

        const assetUrl = "" + get(context.payload, 'release.assets.0.browser_download_url');
        release_robot.log(assetUrl);

        const tarball = "" + get(context.payload, 'release.tarball_url');
        release_robot.log(tarball);

        const zipball = "" + get(context.payload, 'release.tarball_url');
        release_robot.log(zipball);

        // save release data to db
        firebase.database().ref('releases/' + releaseId).set({
            "release_author": author,
            "release_version": version,
            "asset": {
                "asset_name": assetName,
                "asset_size": assetSize,
                "asset_url": assetUrl
            },
            "release_tarball": tarball,
            "release_zipball": zipball
        });

    })
}
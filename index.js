/*
    Filename:   index.js
    Author:     Samantha Emily-Rachel Belnavis
    Date:       June 16, 2018
 */

const firebase = require('firebase');
const get = require('get-value');
const SlackWebhook = require('slack-webhook');

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

// setup slack client
const slack = new SlackWebhook('https://hooks.slack.com/services/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', {
    defaults: {
        username: 'repobot',
        channel: '#general',
        icon_emoji: ':robot_face:'
    }
});

module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};


// this function processes releases and stores the record
// inside a database

module.exports = release_robot => {
    release_robot.on(['release'], async context => {
        // A release was published
        release_robot.log(context);

        const repository = get(context.payload, 'repository.name');
        release_robot.log(repository);

        const releaseId = get(context, 'id');
        release_robot.log(releaseId);

        const author = get(context.payload, 'release.author.login');
        release_robot.log(author);

        const version = get(context.payload, 'release.tag_name');
        release_robot.log(version);

        const assetName = get(context.payload, 'release.assets.0.name');
        release_robot.log(assetName);

        const assetSize = humanReadable(get(context.payload, 'release.assets.0.size'));
        release_robot.log(assetSize);

        const assetUrl = get(context.payload, 'release.assets.0.browser_download_url');
        release_robot.log(assetUrl);

        const tarball = get(context.payload, 'release.tarball_url');
        release_robot.log(tarball);

        const zipball = get(context.payload, 'release.tarball_url');
        release_robot.log(zipball);

        // save release data to db
        firebase.database().ref('releases/' + repository + "/" + releaseId).set({
            "release_author": author,
            "release_version": version,
            "asset": {
                "asset_name": assetName,
                "asset_size": assetSize,
                "asset_url": assetUrl,
                "asset_cdn_url": "https://cdn.samantharachelb/releases/" + repository + "/" + assetName
            },
            "release_tarball": tarball,
            "release_zipball": zipball
        });

        // save the latest release id to db
        firebase.database().ref('releases/' + repository).update({
            "latest_release": {
                "release_id": releaseId,
                "version": version
            }
        });


        // send a message to slack
        slack.send(author + " released version " + version + " of " + repository + ". You can download it here: " +
        assetUrl);
    })
};



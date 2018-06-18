/*
    Filename:   index.js
    Author:     Samantha Emily-Rachel Belnavis
    Date:       June 16, 2018
 */

const firebase = require('firebase')
const get = require('get-value')
const SlackWebhook = require('slack-webhook')

const firebaseConfig = {
  apiKey: process.env.FIREBASE_KEY,
  authDomain: 'cloud-d712b.firebaseapp.com',
  databaseURL: 'https://cloud-d712b.firebaseio.com/',
  storageBucket: 'cloud-d712b.appspot.com'
}

firebase.initializeApp(firebaseConfig)

// convert filesize to something human readable
function humanReadable (filesizeBytes) {
  var i = -1
  var byteUnits = ['KB', 'MB', 'GB']
  do {
    filesizeBytes = filesizeBytes / 1024
    i++
  } while (filesizeBytes > 1024)

  return Math.max(filesizeBytes, 0.1).toFixed(1) + byteUnits[i]
}

// setup slack client
const slack = new SlackWebhook('https://hooks.slack.com/services/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', {
  defaults: {
    username: 'repobot',
    channel: '#general',
    icon_emoji: ':robot_face:'
  }
})

// this function processes releases and stores the record
// inside a database

module.exports = releaseRobot => {
  releaseRobot.on(['release'], async context => {
    // A release was published
    releaseRobot.log(context)

    const repository = get(context.payload, 'repository.name')
    releaseRobot.log(repository)

    const releaseId = get(context, 'id')
    releaseRobot.log(releaseId)

    const author = get(context.payload, 'release.author.login')
    releaseRobot.log(author)

    const version = get(context.payload, 'release.tag_name')
    releaseRobot.log(version)

    const assetName = get(context.payload, 'release.assets.0.name')
    releaseRobot.log(assetName)

    const assetSize = humanReadable(get(context.payload, 'release.assets.0.size'))
    releaseRobot.log(assetSize)

    const assetUrl = get(context.payload, 'release.assets.0.browser_download_url')
    releaseRobot.log(assetUrl)

    const tarball = get(context.payload, 'release.tarball_url')
    releaseRobot.log(tarball)

    const zipball = get(context.payload, 'release.tarball_url')
    releaseRobot.log(zipball)

    // save release data to db
    firebase.database().ref('releases/' + repository + '/' + releaseId).set({
      'release_author': author,
      'release_version': version,
      'asset': {
        'asset_name': assetName,
        'asset_size': assetSize,
        'asset_url': assetUrl,
        'asset_cdn_url': 'https://cdn.samantharachelb/releases/' + repository + '/' + assetName
      },
      'release_tarball': tarball,
      'release_zipball': zipball
    })

    // save the latest release id to db
    firebase.database().ref('releases/' + repository).update({
      'latest_release': {
        'release_id': releaseId,
        'version': version
      }
    })

    // send a message to slack
    slack.send(author + ' released version ' + version + ' of ' + repository + '. You can download it here: ' +
        assetUrl)
  })
}

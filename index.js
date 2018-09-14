/*
    Filename:   index.js
    Author:     Samantha Emily-Rachel Belnavis
    Date:       June 16, 2018
 */

const firebase = require('firebase')
const get = require('get-value')
const moment = require('moment-timezone')
const { BitlyClient } = require('bitly')
const SlackWebhook = require('slack-webhook')

const debugMode = true // set to true to get console output

const firebaseConfig = {
  apiKey: process.env.FIREBASE_KEY,
  authDomain: 'cloud-d712b.firebaseapp.com',
  databaseURL: 'https://cloud-d712b.firebaseio.com/',
  storageBucket: 'cloud-d712b.appspot.com'
}

const bitly = new BitlyClient(process.env.BITLY_KEY, {})

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
    const releaseId = get(context, 'id')
    const author = get(context.payload, 'release.author.login')
    const version = get(context.payload, 'release.tag_name')
    const assetName = get(context.payload, 'release.assets.0.name')
    const assetSize = humanReadable(get(context.payload, 'release.assets.0.size'))
    const assetUrl = get(context.payload, 'release.assets.0.browser_download_url')
    const tarball = get(context.payload, 'release.tarball_url')
    const zipball = get(context.payload, 'release.tarball_url')

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

    if (debugMode === true) {
      releaseRobot.log(repository)
      releaseRobot.log(releaseId)
      releaseRobot.log(author)
      releaseRobot.log(version)
      releaseRobot.log(assetName)
      releaseRobot.log(assetSize)
      releaseRobot.log(assetUrl)
      releaseRobot.log(tarball)
      releaseRobot.log(zipball)
    }
    // send a message to slack
    slack.send(author + ' released version ' + version + ' of ' + repository +
      '.\nYou can download it here: ' + assetUrl)
  })
}

// this module sends a status message to slack
module.exports = statusRobot => {
  statusRobot.on(['status'], async context => {
    statusRobot.log(context)

    const status = get(context.payload, 'state')
    const repo = get(context.payload, 'name')
    var time = get(context.payload, 'updated_at')

    // convert time from UTC-0 to Local time (Toronto)
    const timeFormat = 'HH:mm:ss ZZ'
    const timeDateFormat = 'MMMM, DD, YYYY'
    time = moment.tz(time, 'America/Toronto')
    const timeDate = time.format(timeDateFormat)
    time = time.format(timeFormat)

    // Shorten Build Info Link
    const buildLink = get(context.payload, 'target_url')
    var shortLink = await bitly.shorten(buildLink)
    shortLink = get(shortLink, 'url')

    if (debugMode === true) {
      statusRobot.log(status)
      statusRobot.log(repo)
      statusRobot.log(time)
      statusRobot.log(shortLink)
    }
    // send message to slack
    if (status === 'failure') {
      slack.send('The CI Build failed on "' + repo + '"' +
        '\n\nLast Updated: ' + timeDate + ' at ' + time +
        '.\nMore details available at: ' + shortLink)
    } else if (status === 'pending') {
      slack.send('A CI build started on "' + repo + '"' +
        '\n\nLast Updated: ' + timeDate + ' at ' + time +
        '.\nMore details available at: ' + shortLink)
    } else if (status === 'error') {
      slack.send('The CI Build errored on "' + repo + '"' +
        '\n\nLast Updated: ' + timeDate + ' at ' + time +
        '.\nMore details available at: ' + shortLink)
    } else {
      slack.send('The CI Build passed on "' + repo + '"' +
        '\n\nLast Updated: ' + timeDate + ' at ' + time +
        '.\nMore details available at: ' + shortLink)
    }
  })
}

// this module sends a message to slack about deployment
module.exports = deployRobot => {
  deployRobot.on(['deployment'], async context => {
    deployRobot.log(context.payload)

    const deployPlatform = get(context.payload, 'deployment.description')
    const deployEnvironment = get(context.payload, 'deployment.environment')
    const deployWeblink = get(await bitly.shorten(get(context.payload, 'deployment.payload.web_url')), 'url')
    const deployRepo = get(context.payload, 'repository.full_name')

    if (debugMode === true) {
      deployRobot.log(deployPlatform)
      deployRobot.log(deployEnvironment)
      deployRobot.log(deployWeblink)
    }

    slack.send('A deployment event was triggered on the repository: "' + deployRepo +
    '"\n\nProvider: ' + deployPlatform + '\nEnvironment: ' + deployEnvironment + '\nLink: ' +
    deployWeblink)
  })
}

// this module sends messages to slack about pull requests
module.exports = prRobot => {
  prRobot.on(['pull_request'], async context => {
    prRobot.log(context.payload) // get full payload

    const prState = get(context.payload, 'action')
    const prNumber = get(context.payload, 'number')
    const prUrl = get(await bitly.shorten(get(context.payload, 'pull_request.html_url')), 'url')
    const prTitle = get(context.payload, 'pull_request.title')
    if (debugMode === true) {
      prRobot.log(prState)
      prRobot.log(prNumber)
      prRobot.log(prUrl)
      prRobot.log(prTitle)
    }

    // if pull request action is synchronize
    if (prState === 'synchronize') {
      slack.send('Pull Request #' + prNumber + ' ' + prTitle + ' was updated. ' +
        '\nCheck out the updates here:' + prUrl)
    } else if (prState === 'opened') {
      slack.send('Pull Request #' + prNumber + ' ' + prTitle + ' was opened. ' +
        '\nView the request here:' + prUrl)
    } else if (prState === 'closed') {
      slack.send('Pull Request #' + prNumber + ' ' + prTitle + ' was closed. ' +
        '\nLink to pull request:' + prUrl)
    }
  })
}

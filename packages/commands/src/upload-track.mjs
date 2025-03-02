import { randomBytes, randomInt } from 'crypto'
import { createReadStream } from 'fs'
import { spawn } from 'child_process'
import fs from 'fs'
import { Utils } from '@audius/sdk'

import chalk from 'chalk'
import { program } from 'commander'

import { initializeAudiusLibs, initializeAudiusSdk } from './utils.mjs'
import { Genre } from '@audius/sdk'

function generateWhiteNoise(duration, outFile) {
  return new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', [
      '-f', // audio/video filtering framework
      'lavfi', // provides generic audio filtering for audio/video signals
      '-i', // input flag
      `anoisesrc=d=${duration}`, // generate a noise audio signal for the duration
      outFile, // output filepath
      '-y' // overwrite existing file
    ])

    let error = ''

    process.stderr.on('data', (data) => {
      error += data
    })
    process.on('close', (returncode) => {
      if (returncode !== 0) {
        reject(new Error(`Failed to generate white noise: ${error}`))
      } else {
        resolve()
      }
    })
  })
}

const getStreamConditions = async ({
  streamConditions,
  price: priceString,
  audiusLibs
}) => {
  if (priceString) {
    const price = Number.parseInt(priceString)
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Invalid price "${priceString}"`)
    }
    const { userbank } =
      await audiusLibs.solanaWeb3Manager.createUserBankIfNeeded({
        mint: 'usdc'
      })
    return {
      usdc_purchase: {
        price,
        splits: { [userbank.toString()]: price * 10 ** 4 }
      }
    }
  } else if (streamConditions) {
    return JSON.parse(streamConditions)
  }
  return null
}

const getDownloadConditions = async ({
  streamConditions,
  parsedStreamConditions,
  downloadConditions,
  downloadPrice: downloadPriceString,
  audiusLibs
}) => {
  if (streamConditions) {
    return JSON.parse(streamConditions)
  }
  if (parsedStreamConditions) {
    return parsedStreamConditions
  }
  if (downloadConditions) {
    return JSON.parse(downloadConditions)
  }
  if (downloadPriceString) {
    const price = Number.parseInt(downloadPriceString)
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Invalid price "${downloadPriceString}"`)
    }
    const { userbank } =
      await audiusLibs.solanaWeb3Manager.createUserBankIfNeeded({
        mint: 'usdc'
      })
    return {
      usdc_purchase: {
        price,
        splits: { [userbank.toString()]: price * 10 ** 4 }
      }
    }
  }
  return null
}

program
  .command('upload-track')
  .description('Upload a new track')
  .argument(
    '[track]',
    'track to upload (can be :/path/to/track or %<size>m)',
    '%1m'
  )
  .option(
    '-t, --title <title>',
    'Title of track (chosen randomly if not specified)'
  )
  .option('-a, --tags <tags>', 'Tags of track', null)
  .option(
    '-d, --description <description>',
    'Description of track (chosen randomly if not specified)'
  )
  .option(
    '-m, --mood <mood>',
    'Mood of track (chosen randomly if not specified)'
  )
  .option(
    '-g, --genre <genre>',
    'Genre of track (chosen randomly if not specified)'
  )
  .option(
    '-s, --preview-start-seconds <seconds>',
    'Track preview start time (seconds)',
    null
  )
  .option('-l, --license <license>', 'License of track', null)
  .option('-f, --from <from>', 'The account to upload track from')
  .option(
    '-u, --price <price>',
    'Generate a stream conditions object with the given price in cents. Cannot be used with -r'
  )
  .option(
    '-r, --stream-conditions <stream conditions>',
    'Manually set a stream conditions object. Cannot be used with -u',
    ''
  )
  .option(
    '-o, --is-downloadable <is downloadable>',
    'Whether track is downloadable'
  )
  .option(
    '-dp, --download-price <download price>',
    'Generate a download conditions object with the given price in cents. Cannot be used with -dc'
  )
  .option(
    '-dc, --download-conditions <download conditions>',
    'Manually set a download conditions object. Cannot be used with -dp',
    ''
  )
  .option(
    '--remix <remix-of>',
    'Specify the track ID of the original track if this is a remix'
  )
  .option(
    '--output <path>',
    'A path to which to write a json file containing the track data'
  )
  .option(
    '-h, --hidden',
    'Whether the track is hidden from the feed (ie. is unlisted)'
  )
  .action(
    async (
      track,
      {
        title,
        tags,
        description,
        mood,
        genre,
        previewStartSeconds,
        license,
        from,
        price,
        streamConditions,
        isDownloadable,
        downloadPrice,
        downloadConditions,
        remixOf,
        output,
        hidden
      }
    ) => {
      const audiusLibs = await initializeAudiusLibs(from)

      const rand = randomBytes(2).toString('hex').padStart(4, '0').toUpperCase()

      try {
        let trackStream
        if (track.startsWith('%')) {
          // %filesize
          let [_, size, unit] = track.match(/%(\d+)(.*)/)
          if (unit === 'm') {
            size *= 1024 * 1024
          } else if (unit === 'k') {
            size *= 1024
          } else {
            throw new Error(`Unknown unit "${unit}"`)
          }

          await generateWhiteNoise(size / 8064, '/tmp/audius-cmd.mp3')
          trackStream = createReadStream('/tmp/audius-cmd.mp3')
        } else if (track.startsWith(':')) {
          // :/path/to/track
          trackStream = createReadStream(track.slice(1))
        } else {
          throw new Error(`Failed to parse track "${track}"`)
        }

        const parsedStreamConditions = await getStreamConditions({
          streamConditions,
          price,
          audiusLibs
        })
        const parsedDownloadConditions = await getDownloadConditions({
          streamConditions,
          parsedStreamConditions,
          downloadConditions,
          downloadPrice,
          audiusLibs
        })

        const trackTitle = title || `title ${rand}`
        const response = await audiusLibs.Track.uploadTrackV2AndWriteToChain(
          trackStream,
          null,
          {
            owner_id: audiusLibs.Account.getCurrentUser().user_id,
            cover_art: null,
            cover_art_sizes: null,
            title: trackTitle,
            tags: tags,
            genre:
              genre ||
              Genre[
                Object.keys(Genre)[randomInt(Object.keys(Genre).length - 2) + 1]
              ],
            mood: mood || `mood ${rand}`,
            credits_splits: '',
            created_at: '',
            release_date: null,
            file_type: '',
            description: description || `description ${rand}`,
            license: license,
            isrc: null,
            iswc: null,
            track_segments: [],
            is_stream_gated: parsedStreamConditions != null,
            stream_conditions: parsedStreamConditions,
            is_download_gated: parsedDownloadConditions != null,
            download_conditions: parsedDownloadConditions,
            is_original_available: true,
            is_downloadable: !!isDownloadable,
            ai_attribution_user_id: null,
            allowed_api_keys: null,
            preview_start_seconds: previewStartSeconds
              ? parseInt(previewStartSeconds)
              : null,
            remixOf,
            is_unlisted: !!hidden
          },
          () => null
        )

        if (response.error) {
          program.error(chalk.red(response.error))
        }

        const url = `http://audius-protocol-discovery-provider-1/v1/tracks/${Utils.encodeHashId(
          response.trackId
        )}/stream`

        console.log(chalk.green('Successfully uploaded track!'))
        console.log(chalk.yellow.bold('Track ID:   '), response.trackId)
        console.log(chalk.yellow.bold('Track Title:'), trackTitle)
        console.log(chalk.yellow.bold('Track Stream URL:'), url)

        if (output) {
          fs.writeFileSync(
            output,
            JSON.stringify(
              {
                ...response.updatedMetadata,
                track_id: response.trackId
              },
              null,
              2
            )
          )
        }
      } catch (err) {
        console.log(err)
        program.error(err.message)
      }

      process.exit(0)
    }
  )

import knex from 'knex'
import { logger } from './logger'
import { CronJob } from 'cron'
import { webServer } from './server'
import { createS3Instances } from './s3'
import { clm } from './queries/clm'
import { readConfig } from './config'
import { udr } from './queries/udr'

const main = async () => {
  logger.info({}, 'good morning')

  const config = readConfig()

  const db = knex({
    client: 'pg',
    connection: config.dbUrl
  })

  const { clmS3s, udrS3s } = await createS3Instances()

  const clmJob = CronJob.from({
    // run at 10 AM PST every day
    cronTime: '00 00 10 * * *',
    onTick: async function () {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      await clm(db, clmS3s, yesterday)
    },
    timeZone: 'America/Los_Angeles'
  })
  const udrJob = CronJob.from({
    // run once per quarter, 1 hour into the next quarter
    cronTime: '0 1 1 */3 *',
    onTick: async function () {
      await udr(db, udrS3s, new Date())
    },
    timeZone: 'America/Los_Angeles'
  })

  clmJob.start()
  udrJob.start()

  const server = webServer(db, { clmS3s, udrS3s })
  const port = process.env.audius_mri_port || 6003
  server.listen(port, () => logger.info({ port }, 'webserver is running'))
}

main().catch((err) => {
  logger.error({ err }, 'mri crashed')
  process.exit(1)
})

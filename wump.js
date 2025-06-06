const axios = require('axios')
const fs = require('fs').promises
const path = require('path')
const { readFileSync, writeFileSync } = require('node:fs')
const { SocksProxyAgent } = require('socks-proxy-agent')
const schedule = require('node-schedule')

const ADDRESSES_FILE_PATH = path.join(__dirname, 'tokens.json')

const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    white: '\x1b[37m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
}

const logger = {
    info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
    wallet: (msg) => console.log(`${colors.yellow}[➤] ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}[] ${msg}${colors.reset}`),
    loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
    step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
    banner: () => {
        console.log(`${colors.cyan}${colors.bold}`)
        console.log('░██╗░░░░░░░██╗██╗░░░██╗███╗░░░███╗██████╗░  ██████╗░░█████╗░████████╗')
        console.log('░██║░░██╗░░██║██║░░░██║████╗░████║██╔══██╗  ██╔══██╗██╔══██╗╚══██╔══╝')
        console.log('░╚██╗████╗██╔╝██║░░░██║██╔████╔██║██████╔╝  ██████╦╝██║░░██║░░░██║░░░')
        console.log('░░████╔═████║░██║░░░██║██║╚██╔╝██║██╔═══╝░  ██╔══██╗██║░░██║░░░██║░░░')
        console.log('░░╚██╔╝░╚██╔╝░╚██████╔╝██║░╚═╝░██║██║░░░░░  ██████╦╝╚█████╔╝░░░██║░░░')
        console.log('░░░╚═╝░░░╚═╝░░░╚═════╝░╚═╝░░░░░╚═╝╚═╝░░░░░  ╚═════╝░░╚════╝░░░░╚═╝░░░')
        console.log('\nby Kazmight')
        console.log('\nimproved by 0x范特西')
        console.log('\n更多脚本关注我的X: 0Xiaofan22921')
        console.log(`${colors.reset}\n`)
    },
    agent: (msg) => console.log(`${colors.white}${msg}${colors.reset}`),
}

const getCommonHeaders = (token, userAgent) => ({
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.5',
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    priority: 'u=1, i',
    'sec-ch-ua': userAgent,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'sec-gpc': '1',
    Referer: 'https://wump.xyz/',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
})

const getRefreshHeaders = (userAgent) => ({
    ...getCommonHeaders(null, userAgent),
    authorization: `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTczNzQ2NjYyMCwiZXhwIjo0ODkzMTQwMjIwLCJyb2xlIjoiYW5vbiJ9.qSJu05pftBJrcqaHfX5HZC_kp_ubEWAd0OmHEkNEpIo`,
    apikey: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTczNzQ2NjYyMCwiZXhwIjo0ODkzMTQwMjIwLCJyb2xlIjoiYW5vbiJ9.qSJu05pftBJrcqaHfX5HZC_kp_ubEWAd0OmHEkNEpIo`,
    'x-supabase-api-version': '2024-01-01',
    'content-type': 'application/json;charset=UTF-8',
})

const userHeaders = (token, userAgent) => ({
    ...getCommonHeaders(token, userAgent),
    accept: 'application/vnd.pgrst.object+json',
    'accept-profile': 'public',
    apikey: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTczNzQ2NjYyMCwiZXhwIjo0ODkzMTQwMjIwLCJyb2xlIjoiYW5vbiJ9.qSJu05pftBJrcqaHfX5HZC_kp_ubEWAd0OmHEkNEpIo',
    'x-client-info': 'supabase-ssr/0.5.2',
})

const tasksHeaders = (token, userAgent) => ({
    ...getCommonHeaders(token, userAgent),
    'accept-profile': 'public',
    apikey: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTczNzQ2NjYyMCwiZXhwIjo0ODkzMTQwMjIwLCJyb2xlIjoiYW5vbiJ9.qSJu05pftBJrcqaHfX5HZC_kp_ubEWAd0OmHEkNEpIo',
})

async function getUserInfo(account, userAgent) {
    const { token, proxy } = account
    let httpsAgent
    if (proxy != null && proxy !== '') {
        httpsAgent = new SocksProxyAgent(`${proxy}`)
    }

    try {
        const authResponse = await axios.put(
            'https://api.wump.xyz/auth/v1/user',
            {
                data: { current_task: null },
                code_challenge: null,
                code_challenge_method: null,
            },
            {
                headers: {
                    ...getCommonHeaders(token, userAgent),
                    apikey: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTczNzQ2NjYyMCwiZXhwIjo0ODkzMTQwMjIwLCJyb2xlIjoiYW5vbiJ9.qSJu05pftBJrcqaHfX5HZC_kp_ubEWAd0OmHEkNEpIo',
                    'x-client-info': 'supabase-ssr/0.5.2',
                    'x-supabase-api-version': '2024-01-01',
                },
                httpsAgent,
            }
        )
        const userId = authResponse.data.id
        const userResponse = await axios.get(
            `https://api.wump.xyz/rest/v1/users?select=*&id=eq.${userId}`,
            {
                headers: userHeaders(token, userAgent),
                httpsAgent,
            }
        )
        return userResponse.data
    } catch (error) {
        logger.error(`Failed to fetch user info: ${error.message}`)
        return null
    }
}

async function getTasks(account, userAgent) {
    const { token, proxy } = account
    let httpsAgent
    if (proxy != null && proxy !== '') {
        httpsAgent = new SocksProxyAgent(`${proxy}`)
    }

    try {
        const response = await axios.get('https://api.wump.xyz/rest/v1/tasks?select=*', {
            headers: tasksHeaders(token, userAgent),
            httpsAgent,
        })
        return response.data
    } catch (error) {
        logger.error(`Failed to fetch tasks: ${error.message}`)
        return []
    }
}

async function getUserTasks(account, userId, userAgent) {
    const { token, proxy } = account
    let httpsAgent
    if (proxy != null && proxy !== '') {
        httpsAgent = new SocksProxyAgent(`${proxy}`)
    }

    try {
        const response = await axios.get(
            `https://api.wump.xyz/rest/v1/user_tasks?select=*&user_id=eq.${userId}`,
            {
                headers: tasksHeaders(token, userAgent),
                httpsAgent,
            }
        )
        return response.data
    } catch (error) {
        logger.error(`Failed to fetch tasks: ${error.message}`)
        return []
    }
}

async function completeSocialTask(account, taskId, userAgent) {
    const { token, proxy } = account
    let httpsAgent
    if (proxy != null && proxy !== '') {
        httpsAgent = new SocksProxyAgent(`${proxy}`)
    }

    try {
        const response = await axios.post(
            'https://api.wump.xyz/functions/v1/api/tasks/social_follow',
            {
                taskid: taskId,
            },
            {
                headers: getCommonHeaders(token, userAgent),
                httpsAgent,
            }
        )
        return response.data
    } catch (error) {
        logger.error(`Failed to complete social task ${taskId}: ${error.message}`)
        return null
    }
}

async function refreshToken(account, userAgent) {
    const { proxy, refreshToken } = account
    let httpsAgent
    if (proxy != null && proxy !== '') {
        httpsAgent = new SocksProxyAgent(`${proxy}`)
    }

    try {
        const response = await axios.post(
            'https://api.wump.xyz/auth/v1/token?grant_type=refresh_token',
            {
                refresh_token: refreshToken,
            },
            {
                headers: getRefreshHeaders(userAgent),
                httpsAgent,
            }
        )
        console.log(response.data)
        return response.data
    } catch (error) {
        logger.error(`Failed to refresh token for account ${account.id}: ${error.message}`)
        return null
    }
}

function parseToken(token) {
    const jsonStr = Buffer.from(token, 'base64').toString('utf8')
    const endIndex = jsonStr.indexOf('\"user\"')
    return JSON.parse(jsonStr.slice(0, endIndex - 1) + '}')
}

async function main() {
    logger.banner()
    const data = readFileSync(ADDRESSES_FILE_PATH, 'utf-8')
    const accounts = JSON.parse(data)
    for (const account of accounts) {
        if (!account.time) {
            continue
        }
        schedule.scheduleJob(account.time, async () => {
            console.log(`开始为account${account.id}执行任务`)
            await executeTasks(account.id)
        })
    }

    console.log('定时任务已经配置完成')
}
async function executeTasks(index) {
    try {
        const userAgent =
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'

        const data = readFileSync(ADDRESSES_FILE_PATH, 'utf-8')
        const accounts = JSON.parse(data)
        const account = accounts[index]

        if (!account.token) {
            const tokenInfo = parseToken(account.base64Token)
            account.token = tokenInfo.access_token
            account.refreshToken = tokenInfo.refresh_token
            account.expireAt = tokenInfo.expires_at
        }
        if (Date.now() / 1000 > account.expireAt) {
            console.log('expired! Begin to refresh token')
            const renewedTokenInfo = await refreshToken(account, userAgent)
            account.token = renewedTokenInfo.access_token
            account.expireAt = renewedTokenInfo.expires_at
            account.refreshToken = renewedTokenInfo.refresh_token
        }
        writeFileSync(ADDRESSES_FILE_PATH, JSON.stringify(accounts, null, 2))

        logger.step(`Processing account: ${account.id}`)

        logger.loading('Fetching user information...')
        const userInfo = await getUserInfo(account, userAgent)
        if (userInfo) {
            logger.info(`User: ${userInfo.username}`)
            logger.info(`Global Name: ${userInfo.global_name}`)
            logger.wallet(`Total Points: ${userInfo.total_points}`)
        } else {
            logger.error('Skipping account due to user info fetch failure')
        }

        logger.loading('Fetching tasks...')
        const tasks = await getTasks(account, userAgent)
        const completedTasks = await getUserTasks(account, userInfo.id, userAgent)

        const completedTaskIds = completedTasks.map((it) => it.task_id)
        const dailyTasks = completedTasks.filter((it) => it.task_type === 'daily')
        const latestDailyTask = dailyTasks[dailyTasks.length - 1]
        const completedAt = new Date(latestDailyTask.completed_at)
        const now = new Date()
        let dailyTaskId = null
        if (now.toISOString().slice(0, 10) > completedAt.toISOString().slice(0, 10)){
            dailyTaskId = latestDailyTask.id
        }

        const uncompletedTasks = tasks.filter(
            (it) =>
                it.task_type !== 'referral' &&
                (!completedTaskIds.includes(it.id) || dailyTaskId === it.id)
        )

        if (uncompletedTasks.length === 0) {
            logger.info('current no tasks')
        }

        for (const task of uncompletedTasks) {
            logger.step(`Processing task: ${task.task_description} (${task.points} points)`)

            let result
            if (task.task_type === 'referral') {
                continue
            } else {
                result = await completeSocialTask(account, task.id, userAgent)
            }

            if (result && result.success) {
                logger.success(
                    `Completed task: ${task.task_description} - Earned ${result.result.earned} points`
                )
                logger.info(`Total Points: ${result.result.total_points}`)
            } else {
                logger.error(`Failed to complete task: ${task.task_description}`)
            }

            await new Promise((resolve) => setTimeout(resolve, 2000))
        }

        logger.success('Finished processing all tasks for this account\n')

        logger.success('All account processed successfully!')
    } catch (error) {
        logger.error(`Error: ${error.message}`)
    }
}

main()

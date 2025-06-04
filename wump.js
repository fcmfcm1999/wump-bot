const axios = require('axios')
const fs = require('fs').promises
const path = require('path')
const { readFileSync } = require('node:fs')
const { SocksProxyAgent } = require('socks-proxy-agent')

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

function parseToken(token) {
    const jsonStr = Buffer.from(token, 'base64').toString('utf8')
    const endIndex = jsonStr.indexOf('\"user\"')
    const jsonObj = JSON.parse(jsonStr.slice(0, endIndex - 1) + '}')

    return jsonObj
}

async function main() {
    logger.banner()

    try {
        const data = readFileSync(ADDRESSES_FILE_PATH, 'utf-8')
        const accounts = JSON.parse(data)

        const tokenInfo = parseToken(accounts[0].token)
        if (Date.now() / 1000 > tokenInfo.expires_at) {
            console.log('expired!')
        }

        // for (const account of accounts) {
        const account = accounts[0]
        account.token = tokenInfo.access_token
        logger.step(`Processing account: ${account.id}`)

        const userAgent =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0'
        logger.agent(`Using User-Agent: ${userAgent}`)

        logger.loading('Fetching user information...')
        const userInfo = await getUserInfo(account, userAgent)
        if (userInfo) {
            logger.info(`User: ${userInfo.username}`)
            logger.info(`Global Name: ${userInfo.global_name}`)
            logger.wallet(`Total Points: ${userInfo.total_points}`)
        } else {
            logger.error('Skipping account due to user info fetch failure')
            // continue
        }

        logger.loading('Fetching tasks...')
        const tasks = await getTasks(account, userAgent)
        const completedTasks = await getUserTasks(account, userInfo.id, userAgent)
        const completedTaskIds = completedTasks.map((it) => it.task_id)

        const uncompletedTasks = tasks.filter(
            (it) => it.task_type != 'referral' && !completedTaskIds.includes(it.id)
        )
        if (uncompletedTasks.length === 0) {
            logger.info('current no tasks')
            uncompletedTasks.push(tasks[0])
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
        // }

        logger.success('All account processed successfully!')
    } catch (error) {
        logger.error(`Error: ${error.message}`)
    }
}

main()

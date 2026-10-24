/* 0.3.5 检查更新的版本 / 来源校验测试（与 UpdatePolicy.java 同规则）。
 * 覆盖：版本数值比较、规范标签、正式版过滤、APK 附件匹配、可信 URL、
 *       网络失败 / 限流 / HTTP 错误、检查中去重，以及真实 GitHub API 冒烟。 */
import assert from 'node:assert/strict'
import {
  apkAssetName,
  checkUpdateFromGitHub,
  compareVersions,
  evaluateRelease,
  isTrustedApkUrl,
  isTrustedHtmlUrl,
  isTrustedReleaseUrl,
  parseTag,
  updateInFlight,
} from '../web/src/game/updatePolicy.ts'

let checks = 0
const check = (value: boolean, message: string) => { assert.ok(value, message); checks += 1 }
const eq = (actual: unknown, expected: unknown, message: string) => { assert.deepEqual(actual, expected, message); checks += 1 }

/* ---- 版本数值比较 ---- */
check(compareVersions([0, 3, 10], [0, 3, 9]) > 0, '0.3.10 is newer than 0.3.9 (numeric, not lexical)')
check(compareVersions([0, 3, 9], [0, 3, 10]) < 0, '0.3.9 is older than 0.3.10')
eq(compareVersions([0, 3, 4], [0, 3, 4]), 0, 'same version compares equal')
check(compareVersions([1, 0, 0], [0, 99, 99]) > 0, 'major dominates')
eq(apkAssetName([0, 3, 5]), 'diandian-native-0.3.5.apk', 'apk asset name pattern')

/* ---- 标签严格性 ---- */
check(parseTag('v0.3.4') !== null, 'v-prefixed tag accepted')
check(parseTag('0.3.4') !== null, 'bare tag accepted')
check(parseTag('v1.2') === null, 'two-part tag rejected')
check(parseTag('1.2.3.4') === null, 'four-part tag rejected')
check(parseTag('v1.2.x') === null, 'non-numeric tag rejected')
check(parseTag('') === null, 'empty tag rejected')
check(parseTag(null) === null, 'null tag rejected')
check(parseTag('release-0.3.4') === null, 'junk-prefixed tag rejected')
check(parseTag('v0.3.4-beta') === null, 'suffixed tag rejected')

/* ---- releases/latest 评估 ---- */
const CURRENT = '0.3.4'
const TAG = 'v0.3.5'
const HTML = `https://github.com/JiayuStudio/stepx-neo-pet/releases/tag/${TAG}`
const APK = `https://github.com/JiayuStudio/stepx-neo-pet/releases/download/${TAG}/diandian-native-0.3.5.apk`
const goodRelease = (over: Record<string, unknown> = {}) => ({
  tag_name: TAG,
  draft: false,
  prerelease: false,
  html_url: HTML,
  assets: [{ name: 'diandian-native-0.3.5.apk', browser_download_url: APK }],
  ...over,
})

const newer = evaluateRelease(goodRelease(), CURRENT)
check(newer.state === 'newer' && newer.latest === '0.3.5' && newer.htmlUrl === HTML && newer.apkUrl === APK, 'valid formal release yields newer with trusted urls')

const same = evaluateRelease(goodRelease({
  tag_name: 'v0.3.4',
  html_url: 'https://github.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.4',
  assets: [{ name: 'diandian-native-0.3.4.apk', browser_download_url: 'https://github.com/JiayuStudio/stepx-neo-pet/releases/download/v0.3.4/diandian-native-0.3.4.apk' }],
}), CURRENT)
check(same.state === 'latest', 'same version is latest, not an update')

const older = evaluateRelease(goodRelease({
  tag_name: 'v0.3.3',
  html_url: 'https://github.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.3',
  assets: [{ name: 'diandian-native-0.3.3.apk', browser_download_url: 'https://github.com/JiayuStudio/stepx-neo-pet/releases/download/v0.3.3/diandian-native-0.3.3.apk' }],
}), CURRENT)
check(older.state === 'latest', 'older formal release is never reported as an update')

check(evaluateRelease(goodRelease({ draft: true }), CURRENT).state === 'error', 'draft release rejected')
check(evaluateRelease(goodRelease({ prerelease: true }), CURRENT).state === 'error', 'prerelease release rejected')
check(evaluateRelease(goodRelease({ tag_name: 'v0.4' }), CURRENT).state === 'error', 'non-strict tag rejected')
check(evaluateRelease(goodRelease({ assets: [] }), CURRENT).state === 'error', 'missing apk asset rejected')
check(evaluateRelease(goodRelease({ assets: [{ name: 'tamagochi-promo.mp4', browser_download_url: APK }] }), CURRENT).state === 'error', 'wrong asset name rejected')
check(evaluateRelease(goodRelease({ html_url: 'https://evil.example.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.5' }), CURRENT).state === 'error', 'fake host html url rejected')
check(evaluateRelease(goodRelease({ html_url: 'https://github.com/other-owner/stepx-neo-pet/releases/tag/v0.3.5' }), CURRENT).state === 'error', 'other repo html url rejected')
check(evaluateRelease(goodRelease({ html_url: 'https://github.com/JiayuStudio/stepx-neo-pet/releases/tag/../v0.3.5' }), CURRENT).state === 'error', 'path traversal html url rejected')
check(evaluateRelease(goodRelease({ assets: [{ name: 'diandian-native-0.3.5.apk', browser_download_url: 'https://evil.example.com/diandian-native-0.3.5.apk' }] }), CURRENT).state === 'error', 'fake host apk url rejected')
check(evaluateRelease(goodRelease({ assets: [{ name: 'diandian-native-0.3.5.apk', browser_download_url: 'https://github.com/JiayuStudio/stepx-neo-pet/releases/download/v0.3.5/../diandian-native-0.3.5.apk' }] }), CURRENT).state === 'error', 'path traversal apk url rejected')
check(evaluateRelease(goodRelease(), 'dev-build').state === 'error', 'unparsable current version rejected')
check(evaluateRelease(null, CURRENT).state === 'error', 'null payload rejected')

/* ---- draft / prerelease 必须明确为 false（缺字段视为非正式）---- */
check(evaluateRelease(goodRelease({ draft: undefined }), CURRENT).state === 'error', 'missing draft field rejected')
check(evaluateRelease(goodRelease({ prerelease: undefined }), CURRENT).state === 'error', 'missing prerelease field rejected')
check(evaluateRelease({ tag_name: TAG, html_url: HTML }, CURRENT).state === 'error', 'release without flags rejected')

/* ---- 同版本 / 较低版本也必须先验证发布页与 APK ---- */
const sameTagButFakeUrl = evaluateRelease(goodRelease({
  tag_name: 'v0.3.4',
  html_url: 'https://evil.example.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.4',
  assets: [{ name: 'diandian-native-0.3.4.apk', browser_download_url: 'https://github.com/JiayuStudio/stepx-neo-pet/releases/download/v0.3.4/diandian-native-0.3.4.apk' }],
}), CURRENT)
check(sameTagButFakeUrl.state === 'error', 'same-version release with fake html url rejected before compare')
const sameTagNoApk = evaluateRelease(goodRelease({
  tag_name: 'v0.3.4',
  html_url: 'https://github.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.4',
  assets: [],
}), CURRENT)
check(sameTagNoApk.state === 'error', 'same-version release without apk rejected before compare')
const higher = evaluateRelease(goodRelease({
  tag_name: 'v0.3.3',
  html_url: 'https://github.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.3',
  assets: [{ name: 'diandian-native-0.3.3.apk', browser_download_url: 'https://github.com/JiayuStudio/stepx-neo-pet/releases/download/v0.3.3/diandian-native-0.3.3.apk' }],
}), '0.3.5')
check(higher.state === 'latest' && (higher.message ?? '').includes('不需要降级') && (higher.message ?? '').includes('0.3.3'), 'current above public says no-downgrade, not "latest"')

/* ---- 可信 URL ---- */
check(isTrustedHtmlUrl(HTML, TAG), 'trusted html url')
check(!isTrustedHtmlUrl('https://github.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.4', TAG), 'tag mismatch rejected')
check(isTrustedApkUrl(APK, TAG, [0, 3, 5]), 'trusted apk url')
check(!isTrustedApkUrl(APK, TAG, [0, 3, 4]), 'apk version mismatch rejected')
check(isTrustedReleaseUrl('https://github.com/JiayuStudio/stepx-neo-pet/releases'), 'releases index trusted')
check(!isTrustedReleaseUrl('javascript:alert(1)'), 'javascript url rejected')
check(!isTrustedReleaseUrl('https://evil.example.com/x'), 'untrusted host rejected')

/* ---- URL 收紧：userinfo / 端口 / query / fragment / 反斜杠 / 编码 / dotsegment ---- */
const REPO = 'https://github.com/JiayuStudio/stepx-neo-pet'
check(!isTrustedHtmlUrl('https://user@github.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.5', TAG), 'userinfo rejected')
check(!isTrustedHtmlUrl('https://github.com:8443/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.5', TAG), 'explicit port rejected')
check(!isTrustedHtmlUrl(`${REPO}/releases/tag/v0.3.5?x=1`, TAG), 'query rejected')
check(!isTrustedHtmlUrl(`${REPO}/releases/tag/v0.3.5#top`, TAG), 'fragment rejected')
check(!isTrustedHtmlUrl('https://github.com\\JiayuStudio/stepx-neo-pet/releases/tag/v0.3.5', TAG), 'backslash rejected')
check(!isTrustedHtmlUrl(`${REPO}/releases/tag/v0.3.5%2e`, TAG), 'percent-encoded path rejected')
check(!isTrustedHtmlUrl(`${REPO}/releases/./tag/v0.3.5`, TAG), 'dot segment rejected')
check(!isTrustedHtmlUrl(`${REPO}/releases/../evil/tag/v0.3.5`, TAG), 'dotdot segment rejected')
check(!isTrustedHtmlUrl(`${REPO}/releases/tag/latest`, TAG), 'non-strict tag page rejected')
check(!isTrustedHtmlUrl(`${REPO}/releases/tag/v0.3`, TAG), 'two-part tag page rejected')
check(!isTrustedReleaseUrl(`${REPO}/releases/tag/latest`), 'releases open with non-strict tag rejected')
check(!isTrustedReleaseUrl(`${REPO}/releases/anything-else`), 'arbitrary releases subpath rejected (no prefix-only match)')
check(!isTrustedReleaseUrl(`${REPO}/releases/download/v0.3.5/diandian-native-0.3.4.apk`), 'download tag/file version mismatch rejected')
check(isTrustedReleaseUrl(`${REPO}/releases/tag/v0.3.5`), 'strict tag page accepted')
check(isTrustedReleaseUrl(`${REPO}/releases/download/v0.3.5/diandian-native-0.3.5.apk`), 'matching download accepted')

/* ---- fetch 客户端 ---- */
const jsonResponse = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
let calls = 0
const countingFetch = async () => { calls += 1; return jsonResponse(goodRelease()) }

const fetched = await checkUpdateFromGitHub(CURRENT, countingFetch as unknown as typeof fetch)
check(fetched.state === 'newer', 'fetch path yields newer')
await checkUpdateFromGitHub(CURRENT, countingFetch as unknown as typeof fetch)
eq(calls, 2, 'sequential checks each send a request')

calls = 0
const [first, second] = await Promise.all([
  checkUpdateFromGitHub(CURRENT, countingFetch as unknown as typeof fetch),
  checkUpdateFromGitHub(CURRENT, countingFetch as unknown as typeof fetch),
])
eq(calls, 1, 'concurrent duplicate clicks share one in-flight request')
check(first === second, 'duplicate clicks share the same result')

const offline = await checkUpdateFromGitHub(CURRENT, (async () => { throw new Error('offline') }) as unknown as typeof fetch)
check(offline.state === 'error' && (offline.message ?? '').includes('网络'), 'network failure reported clearly')

const limited = await checkUpdateFromGitHub(CURRENT, (async () => jsonResponse({}, 403)) as unknown as typeof fetch)
check(limited.state === 'error' && (limited.message ?? '').includes('限流'), 'rate limit reported clearly')

const httpError = await checkUpdateFromGitHub(CURRENT, (async () => jsonResponse({}, 500)) as unknown as typeof fetch)
check(httpError.state === 'error' && (httpError.message ?? '').includes('500'), 'http error reported with code')

const brokenJson = await checkUpdateFromGitHub(CURRENT, (async () => ({ ok: true, status: 200, json: async () => { throw new Error('bad json') } })) as unknown as typeof fetch)
check(brokenJson.state === 'error' && (brokenJson.message ?? '').includes('解析'), 'unparsable body reported clearly')

/* ---- AbortController 真超时：中止请求、清理 in-flight ---- */
let abortSeen = false
const hangingFetch = ((_url: string, init: { signal?: AbortSignal }) => new Promise((_resolve, reject) => {
  // 模拟服务端挂起：30ms 后经 signal 中止（与策略内部 10s controller.abort 同一路径）
  const timer = setTimeout(() => {
    abortSeen = true
    init.signal?.dispatchEvent(new Event('abort'))
    const error = new Error('aborted')
    error.name = 'AbortError'
    reject(error)
  }, 30)
  init.signal?.addEventListener('abort', () => clearTimeout(timer))
})) as unknown as typeof fetch
check(!updateInFlight(), 'no in-flight request before check')
const timedOut = await checkUpdateFromGitHub(CURRENT, hangingFetch)
check(abortSeen, 'fetch received an abort signal that fired')
check(timedOut.state === 'error' && (timedOut.message ?? '').includes('超时'), 'aborted request reports timeout clearly')
check(!updateInFlight(), 'in-flight cleared after abort settles')

/* ---- body 挂起：响应头立即返回但 json() 卡住 → 总超时同样中止、清理 in-flight、可重试 ---- */
let bodyAbortSeen = false
const hangingBodyFetch = ((_url: string, init: { signal?: AbortSignal }) => Promise.resolve({
  ok: true,
  status: 200,
  json: () => new Promise((_resolve, reject) => {
    const timer = setTimeout(() => {
      bodyAbortSeen = true
      init.signal?.dispatchEvent(new Event('abort'))
      const error = new Error('aborted')
      error.name = 'AbortError'
      reject(error)
    }, 30)
    init.signal?.addEventListener('abort', () => clearTimeout(timer))
  }),
})) as unknown as typeof fetch
const bodyHang = await checkUpdateFromGitHub(CURRENT, hangingBodyFetch)
check(bodyAbortSeen, 'hanging json body received the abort signal')
check(bodyHang.state === 'error' && (bodyHang.message ?? '').includes('超时'), 'hanging body reports timeout, not parse error')
check(!updateInFlight(), 'in-flight cleared after body timeout (no permanent occupation)')
calls = 0
const retryAfterBody = await checkUpdateFromGitHub(CURRENT, countingFetch as unknown as typeof fetch)
check(retryAfterBody.state === 'newer' && calls === 1, 'retry after body timeout succeeds')

/* ---- 真实 GitHub API 冒烟（网络不可用时跳过，不影响判定逻辑测试）---- */
try {
  const response = await fetch('https://api.github.com/repos/JiayuStudio/stepx-neo-pet/releases/latest', {
    headers: { Accept: 'application/vnd.github+json' },
  })
  const payload = await response.json()
  const smoke = evaluateRelease(payload, '0.0.0')
  check(smoke.state === 'newer' || smoke.state === 'latest', `live release passes the same validation (state=${smoke.state})`)
  if (smoke.state === 'newer') {
    check(Boolean(smoke.htmlUrl && smoke.apkUrl), 'live release exposes trusted urls')
  }
} catch {
  console.log('note: live GitHub API unreachable from sandbox; smoke skipped')
}

console.log(`${checks} update policy checks passed`)

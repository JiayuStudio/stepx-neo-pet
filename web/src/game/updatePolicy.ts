/* =============================================================================
 * 检查更新：以公开 GitHub 仓库的正式 Release 为更新源（0.3.5）
 *
 * 自己实现的轻量校验（不复制第三方更新库），与原生 UpdatePolicy.java 同规则：
 *  - 只认 draft 与 prerelease **明确为 false** 的发布；
 *  - 标签必须严格可比较：v?x.y.z（三段非负整数）；
 *  - 无论版本高低，都先验证可信发布页与匹配的 diandian-native-x.y.z.apk 附件；
 *  - URL 必须精确落在 https://github.com/JiayuStudio/stepx-neo-pet 的固定路径：
 *    拒绝 userinfo、端口、query、fragment、反斜杠、百分号编码路径与 dot segment；
 *  - 数值比较版本，禁止降级误报；当前高于公开版本时明示"不需要降级"。
 *
 * 网页预览（浏览器 / Studio iframe）与原生 APK 共用这套规则；
 * 原生走 NeoNative.checkUpdate 桥，浏览器直连公开 API（无需账户或令牌）。
 * ========================================================================== */

export const GITHUB_OWNER = 'JiayuStudio'
export const GITHUB_REPO = 'stepx-neo-pet'
export const RELEASES_LATEST_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
export const RELEASES_PAGE_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`
export const TRUSTED_HOST = 'github.com'
const TRUSTED_ORIGIN = `https://${TRUSTED_HOST}`
const REPO_PREFIX = `/${GITHUB_OWNER}/${GITHUB_REPO}`
const TAG_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)$/
/* 以下路径均为**仓库相对**（trustedRepoPath 的返回值口径）：/releases/... */
const RELEASE_TAG_PATH = /^\/releases\/tag\/(v?\d+\.\d+\.\d+)$/
const RELEASE_DOWNLOAD_PATH = /^\/releases\/download\/(v?\d+\.\d+\.\d+)\/diandian-native-(\d+)\.(\d+)\.(\d+)\.apk$/
const HTML_PATH_PREFIX = '/releases/tag/'
const DOWNLOAD_PATH_PREFIX = '/releases/download/'
export const FETCH_TIMEOUT_MS = 10_000

export type UpdateState = 'checking' | 'latest' | 'newer' | 'error'

export interface UpdateResult {
  state: UpdateState
  /** 检查时的当前版本 */
  current: string
  /** 正式版响应里的最新公开版本 */
  latest?: string
  /** 可信发布页 */
  htmlUrl?: string
  /** 可信 APK 下载链接 */
  apkUrl?: string
  /** 状态说明（已是最新 / 不需要降级 / 错误原因） */
  message?: string
}

export type Version = [number, number, number]

/** 严格可比较的标签：v?x.y.z（三段非负整数）；其余一律拒绝 */
export function parseTag(tag: unknown): Version | null {
  if (typeof tag !== 'string') return null
  const match = TAG_PATTERN.exec(tag)
  if (!match) return null
  const parts = [Number(match[1]), Number(match[2]), Number(match[3])]
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 999999)) return null
  return [parts[0], parts[1], parts[2]]
}

/** >0 表示 a 更新 */
export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1
  }
  return 0
}

export function formatVersion(version: Version): string {
  return `${version[0]}.${version[1]}.${version[2]}`
}

/** 期望的 APK 附件名：diandian-native-x.y.z.apk */
export function apkAssetName(version: Version): string {
  return `diandian-native-${formatVersion(version)}.apk`
}

/**
 * 收紧的 URL 解析：必须精确是 https://github.com/<owner>/<repo>/... 下的路径。
 * 拒绝 userinfo、显式端口、query、fragment、反斜杠、百分号编码与 dot segment。
 */
function trustedRepoPath(url: unknown): string | null {
  if (typeof url !== 'string') return null
  // startsWith(origin + '/') 已排除 userinfo / 显式端口 / 其他主机（http、大小写变体都不匹配）
  if (!url.startsWith(`${TRUSTED_ORIGIN}/`)) return null
  if (url.includes('\\')) return null
  const rest = url.slice(TRUSTED_ORIGIN.length)
  if (!rest.startsWith(REPO_PREFIX)) return null
  let path = rest.slice(REPO_PREFIX.length)
  const query = path.indexOf('?')
  const hash = path.indexOf('#')
  if (query >= 0 || hash >= 0) return null // 拒 query / fragment
  path = query >= 0 ? path.slice(0, query) : hash >= 0 ? path.slice(0, hash) : path
  if (!path.startsWith('/')) return null
  if (path.includes('%')) return null // 拒百分号编码路径
  if (path.split('/').some((segment) => segment === '.' || segment === '..')) return null // 拒 dot segment
  return path
}

/** 发布页链接：固定 releases 首页，或严格 v?x.y.z 的 tag 页 */
export function isTrustedHtmlUrl(url: unknown, tag: string): boolean {
  if (!TAG_PATTERN.test(tag)) return false
  return trustedRepoPath(url) === `${HTML_PATH_PREFIX}${tag}`
}

/** APK 下载链接：对应 tag 下、文件名与版本精确匹配 */
export function isTrustedApkUrl(url: unknown, tag: string, version: Version): boolean {
  if (!TAG_PATTERN.test(tag)) return false
  return trustedRepoPath(url) === `${DOWNLOAD_PATH_PREFIX}${tag}/${apkAssetName(version)}`
}

/** 打开发布页（原生桥 openExternal）：只放行 releases 首页 / tag 页 / 对应 APK 下载链接 */
export function isTrustedReleaseUrl(url: unknown): boolean {
  const path = trustedRepoPath(url)
  if (path === null) return false
  if (path === '/releases') return true
  const tagPage = RELEASE_TAG_PATH.exec(path)
  if (tagPage) return true
  const download = RELEASE_DOWNLOAD_PATH.exec(path)
  if (!download) return false
  const tagVersion = download[1].replace(/^v/, '')
  const fileVersion = `${download[2]}.${download[3]}.${download[4]}`
  return tagVersion === fileVersion
}

function error(current: string, message: string): UpdateResult {
  return { state: 'error', current, message }
}

/** 校验发布页 + APK 附件（无论版本高低都执行）；通过返回链接，否则返回错误 */
function verifyReleaseLinks(
  release: Record<string, unknown>,
  latest: Version,
  currentText: string,
): { htmlUrl: string; apkUrl: string } | UpdateResult {
  const wanted = apkAssetName(latest)
  const assets = Array.isArray(release.assets) ? release.assets : []
  const asset = assets.find((item) => {
    if (typeof item !== 'object' || item === null) return false
    return (item as Record<string, unknown>).name === wanted
  }) as Record<string, unknown> | undefined
  if (!asset) return error(currentText, `正式版 ${formatVersion(latest)} 没有匹配的 ${wanted} 附件`)

  const tag = String(release.tag_name)
  const apkUrl = asset.browser_download_url
  const htmlUrl = release.html_url
  if (!isTrustedApkUrl(apkUrl, tag, latest) || !isTrustedHtmlUrl(htmlUrl, tag)) {
    return error(currentText, '发布链接未通过可信校验，已停止')
  }
  return { htmlUrl: String(htmlUrl), apkUrl: String(apkUrl) }
}

/**
 * 校验一份 releases/latest 响应（已解析的 JSON）。
 * latest（已是最新 / 不需要降级）/ newer（附可信链接）/ error（明确原因）。
 */
export function evaluateRelease(payload: unknown, currentVersion: string): UpdateResult {
  const current = parseTag(currentVersion)
  if (!current) return error(currentVersion, '当前版本号无法比较')
  if (typeof payload !== 'object' || payload === null) return error(formatVersion(current), '返回内容无法解析')

  const release = payload as Record<string, unknown>
  // draft / prerelease 必须明确为 false（缺字段视为非正式）
  if (release.draft !== false || release.prerelease !== false) {
    return error(formatVersion(current), '没有可用的正式版本（最新发布是草稿或预发布）')
  }

  const latest = parseTag(release.tag_name)
  if (!latest) return error(formatVersion(current), '发布标签不是可比较的 x.y.z 版本')

  const currentText = formatVersion(current)
  // 同版本 / 较低版本也必须先通过发布页与 APK 附件校验
  const links = verifyReleaseLinks(release, latest, currentText)
  if ('state' in links) return links
  const { htmlUrl, apkUrl } = links

  if (compareVersions(latest, current) < 0) {
    return {
      state: 'latest',
      current: currentText,
      latest: formatVersion(latest),
      message: `当前版本高于公开版本 ${formatVersion(latest)}，不需要降级`,
    }
  }
  if (compareVersions(latest, current) === 0) {
    return {
      state: 'latest',
      current: currentText,
      latest: formatVersion(latest),
      message: '已是最新版本',
    }
  }
  return {
    state: 'newer',
    current: currentText,
    latest: formatVersion(latest),
    htmlUrl,
    apkUrl,
    message: `发现新版本 ${formatVersion(latest)}`,
  }
}

/** 单次在途请求：检查中重复调用复用同一 Promise（不发第二次请求） */
let inFlight: Promise<UpdateResult> | null = null

export function updateInFlight(): boolean {
  return inFlight !== null
}

/** 浏览器检查：直连公开 API（无需账户 / 令牌）。fetchImpl 供测试注入。 */
export function checkUpdateFromGitHub(currentVersion: string, fetchImpl: typeof fetch = fetch): Promise<UpdateResult> {
  if (inFlight) return inFlight
  const run = (async (): Promise<UpdateResult> => {
    const current = parseTag(currentVersion)
    if (!current) return error(currentVersion, '当前版本号无法比较')
    const controller = new AbortController()
    // 总时长 10 秒：覆盖连接、响应头与 body 读取全程；abort 会同时解阻塞挂起的 json()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const response = await fetchImpl(RELEASES_LATEST_API, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal,
      })
      if (response.status === 403 || response.status === 429) {
        return error(formatVersion(current), 'GitHub 访问受限（限流），请稍后重试')
      }
      if (!response.ok) {
        return error(formatVersion(current), `检查失败：GitHub 返回 HTTP ${response.status}`)
      }
      let payload: unknown
      try {
        payload = await response.json()
      } catch (cause) {
        // body 读取被 abort（超时）不算解析失败，交给外层统一按超时提示
        if (cause instanceof Error && cause.name === 'AbortError') throw cause
        return error(formatVersion(current), '返回内容无法解析')
      }
      return evaluateRelease(payload, formatVersion(current))
    } catch (cause) {
      const aborted = cause instanceof Error && cause.name === 'AbortError'
      return error(formatVersion(current), aborted ? '检查超时，请重试' : '网络连接失败，请稍后重试')
    } finally {
      clearTimeout(timer)
    }
  })()
  inFlight = run.finally(() => { inFlight = null })
  return inFlight
}

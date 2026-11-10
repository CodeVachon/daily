const REPO = "https://github.com/CodeVachon/daily"

export interface BuildInfo {
  /** "1.2.0" for a release build, "dev" otherwise. */
  version: string
  /** Full commit sha, when known. */
  commit?: string
}

export interface BuildDescription {
  version: string
  /** The GitHub release for a release build. */
  releaseUrl?: string
  /** Short sha. */
  commit?: string
  commitUrl?: string
}

const isRelease = (version: string) => /^\d+\.\d+\.\d+/.test(version)

/** What the About page shows for this build, with links to GitHub. */
export function describeBuild({
  version,
  commit,
}: BuildInfo): BuildDescription {
  return {
    version,
    releaseUrl: isRelease(version)
      ? `${REPO}/releases/tag/v${version}`
      : undefined,
    commit: commit ? commit.slice(0, 7) : undefined,
    commitUrl: commit ? `${REPO}/commit/${commit}` : undefined,
  }
}

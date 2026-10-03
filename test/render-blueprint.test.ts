import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

type EnvVar = { key?: string; value?: string; sync?: boolean; generateValue?: boolean }
type Blueprint = {
  databases: { plan: string }[]
  services: { type: string; runtime: string; healthCheckPath: string; envVars: EnvVar[] }[]
  envVarGroups: { name: string; envVars: EnvVar[] }[]
}

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
const blueprint = parse(read('../render.yaml')) as Blueprint
const pkg = JSON.parse(read('../package.json')) as { engines: { node: string } }

const web = blueprint.services[0]!
const allVars = [...web.envVars, ...blueprint.envVarGroups.flatMap((g) => g.envVars)]
const SECRET_NAME = /(SECRET|PASSCODE|TOKEN|PASSWORD|API_KEY|WEBHOOK_ID)/

describe('render.yaml Blueprint (SC-18)', () => {
  it('never carries a secret value: secrets are prompted for or generated', () => {
    const secrets = allVars.filter((v) => v.key && SECRET_NAME.test(v.key))

    expect(secrets.length).toBeGreaterThan(0)
    for (const secret of secrets) {
      expect(secret.value, `${secret.key} must not have an inline value`).toBeUndefined()
      expect(secret.sync === false || secret.generateValue === true, secret.key).toBe(true)
    }
  })

  it('runs the Node major version the package declares', () => {
    const declared = /\d+/.exec(pkg.engines.node)?.[0]
    const rendered = web.envVars.find((v) => v.key === 'NODE_VERSION')?.value

    expect(rendered).toBe(declared)
  })

  it('uses a paid Postgres (free databases expire after 30 days, D-10)', () => {
    expect(blueprint.databases[0]?.plan).toMatch(/^basic-/)
  })

  it('names a real model provider, because the mock is rejected on Render', () => {
    expect(web.envVars.find((v) => v.key === 'AI_PROVIDER')?.value).toBe('anthropic')
  })

  it('health-checks the public, read-only endpoint', () => {
    expect(web.healthCheckPath).toBe('/api/health')
  })
})

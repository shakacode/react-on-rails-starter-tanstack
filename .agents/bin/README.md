# Agent Scripts

Fixed entry points that [Shaka](https://github.com/shakacode/shaka) runs, so an
agent can call `.agents/bin/<name>` without knowing this repo's specific
commands. Each script is a thin, repo-owned wrapper. A script that is **absent**
means that capability is n/a here.

| Script | Purpose | This repo runs |
| --- | --- | --- |
| `setup` | Install dependencies and prepare the development database | `bin/setup` |
| `validate` | Pre-push gate | `bin/test ci "$@"` |
| `test` | Run tests, including test database preparation | `bin/test "$@"` |
| `validate-local` | Faster checks before local review (optional) | n/a |
| `trigger-hosted-ci` | Start deferred hosted CI (optional) | n/a |

Non-command policy lives in [`../agent-workflow.yml`](../agent-workflow.yml);
see [`../shaka.md`](../shaka.md).
